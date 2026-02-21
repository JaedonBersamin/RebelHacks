import requests
import json
import os
from openai import OpenAI
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
FEATHERLESS_API_KEY = os.getenv("FEATHERLESS_API_KEY")

OUTPUT_PATH = os.path.join("app", "map_ready_events.json")

# Change this if your index.tsx is inside app/(tabs)/ instead
OUTPUT_PATH = os.path.join("app/(tabs)/", "map_ready_events.json")

def get_coordinates(building_name):
    print(f"   -> Geocoding: UNLV {building_name}")
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.location'
    }
    data = {"textQuery": f"UNLV {building_name}"}

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        places = response.json().get('places', [])
        if places:
            loc = places[0].get('location', {})
            return loc.get('latitude'), loc.get('longitude')
    except Exception as e:
        print(f"      Geocoding failed: {e}")
    return None, None

def scrape_and_parse_events():
    print("1. Ripping events from UNLV API...")
    url = "https://involvementcenter.unlv.edu/api/discovery/event/search"

    now_vegas = datetime.now()
    now_utc_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    # We define exactly what "today" looks like as a string (e.g., "Feb 20")
    today_string = now_vegas.strftime("%b %d").replace(" 0", " ")

    params = {
        "orderByField": "endsOn",
        "orderByDirection": "ascending",
        "status": "Approved",
        "take": 15,
        "endsAfter": now_utc_iso
    }

    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        raw_events = response.json().get('value', [])
        print(f"Successfully grabbed {len(raw_events)} active/upcoming events.")
    except Exception as e:
        print(f"API pull failed: {e}")
        return

    pre_processed_events = []

    for event in raw_events:
        try:
            utc_start = datetime.strptime(event['startsOn'][:19], "%Y-%m-%dT%H:%M:%S")
            vegas_start = utc_start - timedelta(hours=8)
            formatted_time = vegas_start.strftime("%b %d at %I:%M %p").replace(" 0", " ")

            # THE IMAGE SCRAPER: Grab the secret imagePath ID
            img_path = event.get('imagePath')

            # If they uploaded a poster, build the full URL.
            # If not, use a high-quality UNLV campus stock photo as a beautiful fallback!
            if img_path:
               image_url = f"https://se-images.campuslabs.com/clink/images/{img_path}"
            else:
                image_url = "https://content.heterodoxacademy.org/uploads/University-of-Nevada-Las-Vegas.jpg"

            pre_processed_events.append({
                "eventName": event.get("name", ""),
                "description": event.get("description", ""),
                "locationName": event.get("location", ""),
                "time": formatted_time,
                "imageUrl": image_url # <-- Add the image to the package
            })
        except Exception as e:
            continue

    client = OpenAI(
        base_url="https://api.featherless.ai/v1",
        api_key=FEATHERLESS_API_KEY
    )

    prompt_data = json.dumps(pre_processed_events)

    system_prompt = """
    You are a data extraction assistant.
    You are receiving a pre-processed JSON array of campus events.

    CRITICAL RULE: DO NOT DELETE OR SKIP ANY EVENTS. Process every single event in the array.

    For each event, return:
    1. eventName: Keep exactly as provided.
    2. locationName: Clean this up to just be the building name or room.
    3. time: Keep exactly as provided.
    4. description: Clean up the provided description to a clean, 1-to-2 sentence summary. Remove HTML.
    5. coolFactor: Write a short, punchy 3-to-5 word hook based on the description.
    6. imageUrl: Keep exactly as provided. DO NOT modify this URL.

    Output a JSON object containing a single array called "events".
    """

    print("2. DeepSeek is writing marketing hooks and cleaning text...")
    llm_response = client.chat.completions.create(
        model="deepseek-ai/DeepSeek-V3.1-Terminus",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_data}
        ],
        response_format={"type": "json_object"},
        max_tokens=8000
    )

    clean_data = llm_response.choices[0].message.content
    events_dict = json.loads(clean_data)

    print("3. Python is enforcing Map Flags and getting GPS Coordinates...")

    for event in events_dict.get('events', []):
        # 1. Geocoding
        lat, lng = get_coordinates(event.get('locationName', ''))
        event['latitude'] = lat
        event['longitude'] = lng

        # 2. IRONCLAD MAP FLAG LOGIC:
        # If the exact string "Feb 20" is inside the AI's time output, it gets the green light.
        # This completely prevents recurring events next week from triggering the map.
        event['showOnMap'] = today_string in event.get('time', '')

    final_json = json.dumps(events_dict, indent=4)
    print("\n--- FINAL PRODUCTION-READY RADAR DATA ---")

    # Save the file directly into your frontend directory
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(final_json)

    print(f"✅ Success! File saved directly to: {OUTPUT_PATH}")

if __name__ == "__main__":
    scrape_and_parse_events()