from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class InsightRequest(BaseModel):
    metric_name: str = Field(..., examples=["glucose"])
    metric_value: float = Field(..., examples=[115.0])
    trend: str = Field(..., examples=["rising"])
    notes: Optional[str] = Field(default=None, examples=["Felt tired after lunch."])
    context: Dict[str, Any] = Field(default_factory=dict)


class InsightResponse(BaseModel):
    summary: str
    recommendations: List[str]
    actions: List[str]
    created_at: datetime


class LivekitTokenRequest(BaseModel):
    room_name: str
    participant_name: str


class LivekitTokenResponse(BaseModel):
    token: str
    url: str


class ProfileResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    name: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class HealthMetricCreate(BaseModel):
    metric_type: str = Field(..., examples=["glucose", "heart_rate", "medication"])
    value: float = Field(..., examples=[110.0])
    unit: Optional[str] = Field(default=None, examples=["mg/dL", "bpm"])
    recorded_at: Optional[datetime] = None


class HealthMetricResponse(BaseModel):
    id: int
    metric_type: str
    value: float
    unit: Optional[str]
    recorded_at: datetime


class EhrAuthUrlResponse(BaseModel):
    url: str
    state: str


class EhrConnectionStatus(BaseModel):
    connected: bool
    patient_id: Optional[str] = None
    fhir_base_url: Optional[str] = None
    expires_at: Optional[datetime] = None


class EhrVital(BaseModel):
    id: str
    name: str
    value: str
    unit: Optional[str] = None
    recorded_at: Optional[str] = None
