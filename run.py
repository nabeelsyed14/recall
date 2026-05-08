import subprocess
import os
import sys
import time

def run():
    # Paths
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("Starting Recall Application...")

    # 1. Start Backend
    print("Starting Backend (FastAPI)...")
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        venv_python = "python"
    
    backend_process = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
    )

    # 2. Start Frontend
    print("Starting Frontend (Vite/React)...")
    frontend_process = subprocess.Popen(
        "npm run dev",
        cwd=frontend_dir,
        shell=True,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
    )

    print("Both services are starting!")
    print("Backend: http://localhost:8000")
    print("Frontend: http://localhost:3000")
    print("Press Ctrl+C to stop both services.\n")

    try:
        while True:
            time.sleep(1)
            if backend_process.poll() is not None:
                print("Backend stopped unexpectedly.")
                break
            if frontend_process.poll() is not None:
                print("Frontend stopped unexpectedly.")
                break
    except KeyboardInterrupt:
        print("Stopping services...")
    finally:
        backend_process.terminate()
        # Kill any node processes on port 3000
        subprocess.run(["taskkill", "/F", "/IM", "node.exe"], capture_output=True)
        print("Services stopped.")

if __name__ == "__main__":
    run()