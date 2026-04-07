from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    status = Column(String, default="pending")  # pending, in_progress, completed
    priority = Column(String, default="medium")  # low, medium, high
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ScheduleEvent(Base):
    __tablename__ = "schedule_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    event_time = Column(DateTime)
    status = Column(String, default="upcoming")  # upcoming, important, completed
    priority = Column(String, default="medium")  # low, medium, high
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"

    id = Column(Integer, primary_key=True, index=True)
    user_request = Column(Text)
    status = Column(String, default="running")  # running, completed, failed
    result = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


Base.metadata.create_all(bind=engine)

# Handle schema migration - drop old schedule_events table if it has wrong schema
try:
    inspector = inspect(engine)
    if 'schedule_events' in inspector.get_table_names():
        columns = {col['name'] for col in inspector.get_columns('schedule_events')}
        # Check if old schema (has start_time or end_time) instead of new (event_time)
        # or if missing priority column
        if 'start_time' in columns or 'end_time' in columns or 'priority' not in columns:
            print("⚠️ Detected old schedule_events schema. Dropping table to recreate...")
            Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['schedule_events']])
            Base.metadata.create_all(bind=engine)
            print("✓ Schedule events table recreated with new schema")
except Exception as e:
    print(f"Note: Could not validate schema: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
