from datetime import datetime, timedelta
import secrets

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import HTMLResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import desc, select
from sqlmodel.ext.asyncio.session import AsyncSession

from ..core.config import settings
from ..core.security import Auth0User, get_current_user, get_user_from_token
from ..db.postgres import engine, get_session
from ..models import EhrAuthSession, EhrConnection, HealthMetric, Insight, User
from ..schemas import (
    EhrAuthUrlResponse,
    EhrConnectionStatus,
    EhrVital,
    HealthMetricCreate,
    HealthMetricResponse,
    InsightRequest,
    InsightResponse,
    LivekitTokenRequest,
    LivekitTokenResponse,
    ProfileResponse,
)
from ..services.analytics import write_event
from ..services.ehr_client import (
    build_authorize_url,
    compute_expires_at,
    create_code_challenge,
    create_code_verifier,
    exchange_code_for_token,
    fetch_vitals,
    refresh_access_token,
    resolve_patient_id,
)
from ..services.langchain_service import generate_insight
from ..services.livekit_service import create_livekit_token
from ..services.queueing import publish_event


router = APIRouter()
metric_connections: set[WebSocket] = set()


def serialize_metric(metric: HealthMetric) -> HealthMetricResponse:
    return HealthMetricResponse(
        id=metric.id or 0,
        metric_type=metric.metric_type,
        value=metric.value,
        unit=metric.unit,
        recorded_at=metric.recorded_at,
    )


async def broadcast_metric(metric: HealthMetricResponse) -> None:
    if not metric_connections:
        return
    payload = metric.model_dump()
    stale: list[WebSocket] = []
    for socket in metric_connections:
        try:
            await socket.send_json(payload)
        except Exception:
            stale.append(socket)
    for socket in stale:
        metric_connections.discard(socket)


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "thrive-ai-api"}


@router.get("/v1/profile", response_model=ProfileResponse)
async def get_profile(
    user: Auth0User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ProfileResponse:
    try:
        result = await session.exec(select(User).where(User.auth0_id == user.user_id))
        existing = result.one_or_none()
        if not existing:
            existing = User(auth0_id=user.user_id, email=user.get("email"), name=user.get("name"))
            session.add(existing)
            await session.commit()
    except SQLAlchemyError:
        await session.rollback()
    return ProfileResponse(
        user_id=user.user_id,
        email=user.get("email"),
        name=user.get("name"),
        metadata={"provider": "auth0"},
    )


@router.post("/v1/insights", response_model=InsightResponse)
async def create_insight(
    payload: InsightRequest,
    user: Auth0User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> InsightResponse:
    insight = generate_insight(payload)
    event = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user.user_id,
        "metric_name": payload.metric_name,
        "metric_value": payload.metric_value,
        "trend": payload.trend,
    }
    publish_event(event)
    write_event(event)
    try:
        session.add(
            Insight(
                user_auth0_id=user.user_id,
                metric_name=payload.metric_name,
                metric_value=payload.metric_value,
                trend=payload.trend,
                summary=insight.summary,
            )
        )
        await session.commit()
    except SQLAlchemyError:
        await session.rollback()
    return insight


@router.get("/v1/metrics/latest", response_model=list[HealthMetricResponse])
async def get_latest_metrics(
    metric_type: Optional[str] = None,
    limit: int = 20,
    user: Auth0User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[HealthMetricResponse]:
    query = select(HealthMetric).where(HealthMetric.user_auth0_id == user.user_id)
    if metric_type:
        query = query.where(HealthMetric.metric_type == metric_type)
    query = query.order_by(desc(HealthMetric.recorded_at)).limit(limit)
    result = await session.exec(query)
    return [serialize_metric(metric) for metric in result.all()]


@router.post("/v1/metrics", response_model=HealthMetricResponse)
async def create_metric(
    payload: HealthMetricCreate,
    user: Auth0User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> HealthMetricResponse:
    metric = HealthMetric(
        user_auth0_id=user.user_id,
        metric_type=payload.metric_type,
        value=payload.value,
        unit=payload.unit,
        recorded_at=payload.recorded_at or datetime.utcnow(),
    )
    session.add(metric)
    await session.commit()
    await session.refresh(metric)
    response = serialize_metric(metric)
    await broadcast_metric(response)
    return response


@router.websocket("/v1/metrics/stream")
async def stream_metrics(websocket: WebSocket, token: Optional[str] = None) -> None:
    if not token:
        await websocket.close(code=4401)
        return
    try:
        user = get_user_from_token(token)
    except HTTPException:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    metric_connections.add(websocket)

    async with AsyncSession(engine) as ws_session:
        try:
            query = (
                select(HealthMetric)
                .where(HealthMetric.user_auth0_id == user.user_id)
                .order_by(desc(HealthMetric.recorded_at))
                .limit(20)
            )
            result = await ws_session.exec(query)
            await websocket.send_json(
                {
                    "type": "snapshot",
                    "data": [serialize_metric(metric).model_dump() for metric in result.all()],
                }
            )
        except Exception:
            await websocket.send_json({"type": "snapshot", "data": []})

    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        metric_connections.discard(websocket)


@router.post("/v1/livekit/token", response_model=LivekitTokenResponse)
async def create_token(
    payload: LivekitTokenRequest,
    user: Auth0User = Depends(get_current_user),
) -> LivekitTokenResponse:
    try:
        token = create_livekit_token(payload.room_name, payload.participant_name or user.user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return LivekitTokenResponse(token=token, url=settings.livekit_url)


@router.post("/v1/livekit/room", response_model=LivekitTokenResponse)
async def create_room_token(
    payload: LivekitTokenRequest,
    user: Auth0User = Depends(get_current_user),
) -> LivekitTokenResponse:
    """
    LiveKit automatically creates rooms on first join by default.
    This endpoint returns a token for a named room.
    """
    try:
        token = create_livekit_token(payload.room_name, payload.participant_name or user.user_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return LivekitTokenResponse(token=token, url=settings.livekit_url)


async def _load_connection(session: AsyncSession, user_id: str) -> Optional[EhrConnection]:
    result = await session.exec(select(EhrConnection).where(EhrConnection.user_auth0_id == user_id))
    return result.one_or_none()


async def _refresh_connection_if_needed(session: AsyncSession, connection: EhrConnection) -> EhrConnection:
    if connection.expires_at > datetime.utcnow() + timedelta(seconds=60):
        return connection
    if not connection.refresh_token:
        return connection
    token_response = await refresh_access_token(connection.refresh_token)
    connection.access_token = token_response.get("access_token", connection.access_token)
    connection.refresh_token = token_response.get("refresh_token", connection.refresh_token)
    connection.token_type = token_response.get("token_type", connection.token_type)
    connection.scope = token_response.get("scope", connection.scope)
    connection.expires_at = compute_expires_at(token_response.get("expires_in"))
    connection.updated_at = datetime.utcnow()
    session.add(connection)
    await session.commit()
    await session.refresh(connection)
    return connection


@router.get("/v1/ehr/auth-url", response_model=EhrAuthUrlResponse)
async def create_ehr_auth_url(
    user: Auth0User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EhrAuthUrlResponse:
    if not settings.ehr_client_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="EHR client not configured.")
    state = secrets.token_urlsafe(16)
    code_verifier = create_code_verifier()
    code_challenge = create_code_challenge(code_verifier)
    session.add(EhrAuthSession(state=state, user_auth0_id=user.user_id, code_verifier=code_verifier))
    await session.commit()
    return EhrAuthUrlResponse(url=build_authorize_url(state, code_challenge), state=state)


@router.get("/v1/ehr/callback")
async def handle_ehr_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
) -> HTMLResponse:
    if error:
        return HTMLResponse(f"<h2>Connection failed</h2><p>{error}</p>", status_code=400)
    if not code or not state:
        return HTMLResponse("<h2>Missing authorization response.</h2>", status_code=400)
    result = await session.exec(select(EhrAuthSession).where(EhrAuthSession.state == state))
    auth_session = result.one_or_none()
    if not auth_session:
        return HTMLResponse("<h2>Invalid or expired session.</h2>", status_code=400)
    token_response = await exchange_code_for_token(code, auth_session.code_verifier)
    result = await session.exec(
        select(EhrConnection).where(EhrConnection.user_auth0_id == auth_session.user_auth0_id)
    )
    connection = result.one_or_none()
    expires_at = compute_expires_at(token_response.get("expires_in"))
    if not connection:
        connection = EhrConnection(
            user_auth0_id=auth_session.user_auth0_id,
            access_token=token_response.get("access_token", ""),
            refresh_token=token_response.get("refresh_token"),
            token_type=token_response.get("token_type"),
            scope=token_response.get("scope"),
            expires_at=expires_at,
            patient_id=token_response.get("patient"),
            fhir_base_url=settings.ehr_fhir_base_url,
            updated_at=datetime.utcnow(),
        )
    else:
        connection.access_token = token_response.get("access_token", connection.access_token)
        connection.refresh_token = token_response.get("refresh_token", connection.refresh_token)
        connection.token_type = token_response.get("token_type", connection.token_type)
        connection.scope = token_response.get("scope", connection.scope)
        connection.expires_at = expires_at
        connection.patient_id = token_response.get("patient") or connection.patient_id
        connection.fhir_base_url = settings.ehr_fhir_base_url
        connection.updated_at = datetime.utcnow()
    session.add(connection)
    await session.commit()
    await session.delete(auth_session)
    await session.commit()
    return HTMLResponse("<h2>Connected to EHR.</h2><p>You can return to the app now.</p>")


@router.get("/v1/ehr/connection", response_model=EhrConnectionStatus)
async def get_ehr_connection(
    user: Auth0User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EhrConnectionStatus:
    connection = await _load_connection(session, user.user_id)
    if not connection:
        return EhrConnectionStatus(connected=False)
    return EhrConnectionStatus(
        connected=True,
        patient_id=connection.patient_id,
        fhir_base_url=connection.fhir_base_url,
        expires_at=connection.expires_at,
    )


@router.post("/v1/ehr/disconnect")
async def disconnect_ehr(
    user: Auth0User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    connection = await _load_connection(session, user.user_id)
    if connection:
        await session.delete(connection)
        await session.commit()
    return {"ok": True}


@router.get("/v1/ehr/vitals", response_model=list[EhrVital])
async def get_ehr_vitals(
    user: Auth0User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[EhrVital]:
    connection = await _load_connection(session, user.user_id)
    if not connection:
        raise HTTPException(status_code=404, detail="EHR connection not found.")
    connection = await _refresh_connection_if_needed(session, connection)
    fhir_base_url = connection.fhir_base_url or settings.ehr_fhir_base_url
    if not fhir_base_url:
        raise HTTPException(status_code=503, detail="FHIR base URL not configured.")
    patient_id = connection.patient_id
    if not patient_id:
        patient_id = await resolve_patient_id(connection.access_token, fhir_base_url)
        if patient_id:
            connection.patient_id = patient_id
            connection.updated_at = datetime.utcnow()
            session.add(connection)
            await session.commit()
    if not patient_id:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return await fetch_vitals(connection.access_token, fhir_base_url, patient_id)
