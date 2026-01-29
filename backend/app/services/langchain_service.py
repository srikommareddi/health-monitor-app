from datetime import datetime
from typing import List

from ..schemas import InsightRequest, InsightResponse
from ..core.config import settings


def _fallback_response(payload: InsightRequest) -> InsightResponse:
    summary = (
        f"{payload.metric_name.title()} is {payload.metric_value:.0f} "
        f"and trending {payload.trend}. Keep an eye on hydration and activity."
    )
    return InsightResponse(
        summary=summary,
        recommendations=["Log meals around spikes", "Do a short walk after meals"],
        actions=["Start a 10-min breathing session", "Schedule a check-in"],
        created_at=datetime.utcnow(),
    )


def generate_insight(payload: InsightRequest) -> InsightResponse:
    if settings.langchain_provider.lower() != "openai":
        return _fallback_response(payload)

    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage

        model = ChatOpenAI(api_key=settings.openai_api_key, model="gpt-4o-mini", temperature=0.3)
        system = SystemMessage(
            content="You are a clinical wellness assistant. Provide short insights and actions."
        )
        human = HumanMessage(
            content=(
                "Metric: {name}\nValue: {value}\nTrend: {trend}\nNotes: {notes}\n"
                "Context: {context}\nProvide a 1-2 sentence summary and 2 actions."
            ).format(
                name=payload.metric_name,
                value=payload.metric_value,
                trend=payload.trend,
                notes=payload.notes or "none",
                context=payload.context,
            )
        )
        response = model.invoke([system, human]).content
        actions = [
            "Hydrate and re-check in 30 minutes",
            "Log meals and activity for the next 4 hours",
        ]
        return InsightResponse(
            summary=response.strip(),
            recommendations=["Monitor next 2 readings", "Balance meals with fiber/protein"],
            actions=actions,
            created_at=datetime.utcnow(),
        )
    except Exception:
        return _fallback_response(payload)
