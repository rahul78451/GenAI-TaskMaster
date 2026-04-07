import requests

api_key = 'AIzaSyA0af2_whAXKdxJXKa417Y1Aj7VTwvFPSY'
url = 'https://generativelanguage.googleapis.com/v1/models'
params = {'key': api_key}

response = requests.get(url, params=params, timeout=15)
data = response.json()

print("Available Gemini Models:")
print("-" * 50)
for model in data.get('models', []):
    name = model['name'].replace('models/', '')
    display_name = model.get('displayName', 'N/A')
    print(f"{name}: {display_name}")
