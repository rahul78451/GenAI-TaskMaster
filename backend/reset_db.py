import os
import time
import sqlite3

db_path = "app.db"

# Give any file locks time to release
time.sleep(3)

# Try to close the database connection if it exists and delete
if os.path.exists(db_path):
    try:
        # Force delete by opening and closing connection
        conn = sqlite3.connect(db_path)
        conn.close()
        os.remove(db_path)
        print(f"✓ Successfully deleted {db_path}")
    except Exception as e:
        print(f"✗ Error: {e}")
        # Try alternative: move instead of delete
        try:
            import shutil
            backup_path = db_path + ".bak"
            shutil.move(db_path, backup_path)
            print(f"✓ Moved to {backup_path}")
        except:
            print(f"Could not delete or move database file")
else:
    print(f"Database file not found")
