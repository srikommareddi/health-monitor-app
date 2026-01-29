import base64
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

import httpx

from ..core.config import settings


def _base64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def create_code_verifier() -> str:
    return _base64url_encode(secrets.token_bytes(32))


def create_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("utf-8")).digest()
    return _base64url_encode(digest)


def build_authorize_url(state: str, code_challenge: str) -> str:
    params = {
        "response_type": "code",
        "client_id": settings.ehr_client_id,
        "redirect_uri": settings.ehr_redirect_uri,
        "scope": settings.ehr_scopes,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    if settings.ehr_fhir_base_url:
        params["aud"] = settings.ehr_fhir_base_url
    request = httpx.Request("GET", settings.ehr_authorize_url, params=params)
    return str(request.url)


async def exchange_code_for_token(code: str, code_verifier: str) -> Dict[str, Any]:
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.ehr_redirect_uri,
        "client_id": settings.ehr_client_id,
        "code_verifier": code_verifier,
    }
    if settings.ehr_client_secret:
        payload["client_secret"] = settings.ehr_client_secret
    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.post(settings.ehr_token_url, data=payload)
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    payload = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": settings.ehr_client_id,
    }
    if settings.ehr_client_secret:
        payload["client_secret"] = settings.ehr_client_secret
    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.post(settings.ehr_token_url, data=payload)
        response.raise_for_status()
        return response.json()


def compute_expires_at(expires_in: Optional[int]) -> datetime:
    lifetime = expires_in or 3600
    return datetime.utcnow() + timedelta(seconds=lifetime)


async def resolve_patient_id(access_token: str, fhir_base_url: str) -> Optional[str]:
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.get(f"{fhir_base_url}/Patient", headers=headers, params={"_count": 1})
        if response.status_code >= 400:
            return None
        payload = response.json()
        entries = payload.get("entry") or []
        if entries:
            resource = entries[0].get("resource") or {}
            return resource.get("id")
    return None


def _extract_quantity(observation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    value = observation.get("valueQuantity")
    if value:
        return value
    components = observation.get("component") or []
    if components:
        return components[0].get("valueQuantity")
    return None


def _extract_effective_at(observation: Dict[str, Any]) -> Optional[str]:
    return observation.get("effectiveDateTime") or observation.get("issued")


def _extract_display(observation: Dict[str, Any]) -> str:
    code = observation.get("code") or {}
    text = code.get("text")
    if text:
        return text
    coding = code.get("coding") or []
    if coding:
        return coding[0].get("display") or "Observation"
    return "Observation"


def parse_vitals(bundle: Dict[str, Any]) -> List[Dict[str, Any]]:
    entries = bundle.get("entry") or []
    vitals: List[Dict[str, Any]] = []
    for entry in entries:
        resource = entry.get("resource") or {}
        if resource.get("resourceType") != "Observation":
            continue
        quantity = _extract_quantity(resource)
        display = _extract_display(resource)
        effective_at = _extract_effective_at(resource)
        if quantity:
            vitals.append(
                {
                    "id": resource.get("id") or "",
                    "name": display,
                    "value": str(quantity.get("value", "")),
                    "unit": quantity.get("unit"),
                    "recorded_at": effective_at,
                }
            )
        else:
            vitals.append(
                {
                    "id": resource.get("id") or "",
                    "name": display,
                    "value": "n/a",
                    "unit": None,
                    "recorded_at": effective_at,
                }
            )
    return vitals


async def fetch_vitals(access_token: str, fhir_base_url: str, patient_id: str) -> List[Dict[str, Any]]:
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "category": "vital-signs",
        "patient": patient_id,
        "_count": 10,
        "_sort": "-date",
    }
    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.get(f"{fhir_base_url}/Observation", headers=headers, params=params)
        response.raise_for_status()
        return parse_vitals(response.json())
