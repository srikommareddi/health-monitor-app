from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    auth0_id: str = Field(index=True)
    email: Optional[str] = None
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Insight(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_auth0_id: str = Field(index=True)
    metric_name: str
    metric_value: float
    trend: str
    summary: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class HealthMetric(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_auth0_id: str = Field(index=True)
    metric_type: str = Field(index=True)
    value: float
    unit: Optional[str] = None
    recorded_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EhrAuthSession(SQLModel, table=True):
    state: str = Field(primary_key=True)
    user_auth0_id: str = Field(index=True)
    code_verifier: str
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class EhrConnection(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_auth0_id: str = Field(index=True)
    access_token: str
    refresh_token: Optional[str] = None
    token_type: Optional[str] = None
    scope: Optional[str] = None
    expires_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    patient_id: Optional[str] = None
    fhir_base_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
