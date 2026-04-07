from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScheduleEventCreate(BaseModel):
    title: str
    event_time: datetime
    status: Optional[str] = "upcoming"
    description: Optional[str] = None
    priority: Optional[str] = "medium"


class ScheduleEventUpdate(BaseModel):
    title: Optional[str] = None
    event_time: Optional[datetime] = None
    status: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None


class ScheduleEventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    event_time: datetime
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NoteCreate(BaseModel):
    title: str
    content: str


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowRequest(BaseModel):
    request: str


class WorkflowResponse(BaseModel):
    id: int
    user_request: str
    status: str
    result: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True
