import time
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from pydantic import BaseModel
from pydantic.config import ConfigDict

from .config import settings


class Auth0User(BaseModel):
    sub: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None

    model_config = ConfigDict(extra="allow")

    @property
    def user_id(self) -> str:
        return self.sub or "unknown"


class Auth0JWTBearer(HTTPBearer):
    def __init__(self) -> None:
        super().__init__(auto_error=True)
        self._jwks_cache: Dict[str, Any] = {}
        self._jwks_expiry: float = 0.0

    async def __call__(self, request: Request) -> Auth0User:
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)  # type: ignore
        if credentials.scheme.lower() != "bearer":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth scheme")
        if settings.environment == "local" and credentials.credentials == "dev":
            return Auth0User(sub="dev-user", email="dev@local", name="Dev User")
        return Auth0User(**self._verify_token(credentials.credentials))

    def _verify_token(self, token: str) -> Dict[str, Any]:
        jwks = self._get_jwks()
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token key")

        return jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=settings.auth0_issuer,
        )

    def _get_jwks(self) -> Dict[str, Any]:
        now = time.time()
        if self._jwks_cache and now < self._jwks_expiry:
            return self._jwks_cache

        url = f"https://{settings.auth0_domain}/.well-known/jwks.json"
        response = httpx.get(url, timeout=8.0)
        response.raise_for_status()
        self._jwks_cache = response.json()
        self._jwks_expiry = now + 3600
        return self._jwks_cache


auth0_scheme = Auth0JWTBearer()


async def get_current_user(user: Auth0User = auth0_scheme) -> Auth0User:  # type: ignore
    return user


def get_user_from_token(token: str) -> Auth0User:
    if settings.environment == "local" and token == "dev":
        return Auth0User(sub="dev-user", email="dev@local", name="Dev User")
    return Auth0User(**auth0_scheme._verify_token(token))
