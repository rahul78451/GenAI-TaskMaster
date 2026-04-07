#!/usr/bin/env python
"""Test script to validate backend setup"""
import sys
import os

# Set Python path
sys.path.insert(0, os.path.dirname(__file__))

try:
    print("1. Testing imports...")
    from app.models.database import engine, get_db, Task, ScheduleEvent, Note
    from app.models.schemas import ScheduleEventCreate, ScheduleEventUpdate, ScheduleEventResponse
    print("   ✓ All imports successful")
    
    print("\n2. Checking database connection...")
    from sqlalchemy import text
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("   ✓ Database connection works")
    
    print("\n3. Creating tables...")
    from app.models.database import Base
    Base.metadata.create_all(bind=engine)
    print("   ✓ Tables created/verified")
    
    print("\n✓ Database schema is ready! You can now start the backend:")
    print("   python main.py")
    
except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
