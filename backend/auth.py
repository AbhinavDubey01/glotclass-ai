import functools
import json
import os
from flask import request, jsonify
import firebase_admin
from firebase_admin import auth, credentials

# Read from environment variable on Render
service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")

if service_account_json:
    service_account_dict = json.loads(service_account_json)
    cred = credentials.Certificate(service_account_dict)
else:
    # Local development — use file
    cred = credentials.Certificate("serviceAccountKey.json")

firebase_admin.initialize_app(cred)

def require_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing Authorization header"}), 401
        token = auth_header.split("Bearer ")[1]
        try:
            decoded = auth.verify_id_token(token)
            request.uid   = decoded["uid"]
            request.email = decoded.get("email", "")
        except auth.ExpiredIdTokenError:
            return jsonify({"error": "Session expired"}), 401
        except auth.InvalidIdTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            return jsonify({"error": f"Auth error: {str(e)}"}), 401
        return f(*args, **kwargs)
    return decorated