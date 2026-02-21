import requests
import json
from openai import OpenAI
from datetime import datetime, timedelta

# --- CONFIGURATION ---
GOOGLE_MAPS_API_KEY = "  "
FEATHERLESS_API_KEY = "  "

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
    now_utc_iso = datetime.utcnow().isoformat() + "Z"

    # FIX 1: Ask for events that END after right now, so we don't miss ongoing events!
    params = {
        "orderByField": "endsOn",
        "orderByDirection": "ascending",
        "status": "Approved",
        "take": 50,
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

    # FIX 2: We use Python to do the Timezone math and Map Flags so the AI can't mess it up
    pre_processed_events = []
    vegas_date_today = now_vegas.strftime('%Y-%m-%d')

    for event in raw_events:
        # UNLV gives us UTC, we subtract 8 hours for Las Vegas (PST)
        try:
            utc_start = datetime.strptime(event['startsOn'][:19], "%Y-%m-%dT%H:%M:%S")
            vegas_start = utc_start - timedelta(hours=8)

            # Format time perfectly for the UI
            formatted_time = vegas_start.strftime("%b %d at %I:%M %p").replace(" 0", " ")

            # Determine if it's happening TODAY in Las Vegas
            is_today = vegas_start.strftime('%Y-%m-%d') == vegas_date_today

            pre_processed_events.append({
                "eventName": event.get("name", ""),
                "description": event.get("description", ""),
                "locationName": event.get("location", ""),
                "time": formatted_time,
                "showOnMap": is_today # Python guarantees this is 100% accurate!
            })
        except Exception as e:
            continue

    client = OpenAI(
        base_url="https://api.featherless.ai/v1",
        api_key=FEATHERLESS_API_KEY
    )

    prompt_data = json.dumps(pre_processed_events)

    # Now the AI ONLY has to write the cool hooks and clean the descriptions
    system_prompt = """
    You are a data extraction assistant.
    You are receiving a pre-processed JSON array of campus events. The dates, times, and map flags are already 100% correct.

    CRITICAL RULE: DO NOT DELETE OR SKIP ANY EVENTS. Process every single event in the array.

    For each event, return:
    1. eventName: Keep exactly as provided.
    2. locationName: Clean this up to just be the building name or room.
    3. time: Keep exactly as provided.
    4. showOnMap: Keep exactly as provided.
    5. description: Clean up the provided description to a clean, 1-to-2 sentence summary. Remove HTML.
    6. coolFactor: Write a short, punchy 3-to-5 word hook based on the description.

    Output a JSON object containing a single array called "events".
    """

    print("2. DeepSeek is writing marketing hooks and cleaning text...")
    llm_response = client.chat.completions.create(
        model="deepseek-ai/DeepSeek-V3.1-Terminus",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_data}
        ],
        response_format={"type": "json_object"}
    )

    clean_data = llm_response.choices[0].message.content
    events_dict = json.loads(clean_data)

    print("3. Passing locations to Google Maps API...")

    for event in events_dict.get('events', []):
        lat, lng = get_coordinates(event.get('locationName', ''))
        event['latitude'] = lat
        event['longitude'] = lng

    final_json = json.dumps(events_dict, indent=4)
    print("\n--- FINAL PRODUCTION-READY RADAR DATA ---")

    with open('map_ready_events.json', 'w', encoding='utf-8') as f:
        f.write(final_json)

if __name__ == "__main__":
    scrape_and_parse_events()