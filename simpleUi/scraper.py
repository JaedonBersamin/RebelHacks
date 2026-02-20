import requests
import json
from openai import OpenAI

def scrape_and_parse_events():
    print("1. Ripping events from UNLV API...")
    url = "https://involvementcenter.unlv.edu/api/discovery/event/search"
    params = {"orderByField": "endsOn", "orderByDirection": "ascending", "status": "Approved", "take": 10}
    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        raw_events = response.json().get('value', [])
        print(f"Successfully grabbed {len(raw_events)} events. Handing off to DeepSeek...")

    except Exception as e:
        print(f"API pull failed: {e}")
        return

    # 2. Initialize Featherless via the OpenAI SDK
    client = OpenAI(
        base_url="https://api.featherless.ai/v1",
        api_key="rc_151483bfc24aadfb736a37b99cff5cb8517d7026c9e5f419d9b9f5bd056fbf0d"
    )

    prompt_data = json.dumps(raw_events)

    # The Upgraded System Prompt
    system_prompt = """
    You are a data extraction assistant for a campus map app.
    Read the provided raw JSON event data and extract ONLY the following fields for each event:

    1. eventName: The official name of the event.
    2. coolFactor: A short, punchy 3-to-5 word hook about what makes the event awesome or why a student should go (e.g., "Free Pizza & Giveaways!", "Network with Tech CEOs", "Free Concert on Campus"). Be creative but accurate based on the description.
    3. description: A clean, 1-to-2 sentence summary of what the event is about. Remove any messy HTML formatting.
    4. locationName: Just the building name or room (e.g., "Student Union", "TBE").
    5. time: Format as a clean string (e.g., "Feb 20 at 5:00 PM").

    You must output a JSON object containing a single array called "events".
    Example format:
    {
      "events": [
        {
          "eventName": "CS Resume Workshop",
          "coolFactor": "Land Your Dream Internship",
          "description": "Bring your resume and get live feedback from senior professors and alumni. Free snacks provided.",
          "locationName": "TBE",
          "time": "Feb 20 at 4:00 PM"
        }
      ]
    }
    """

    print("3. DeepSeek is parsing the data and writing the hooks...")

    llm_response = client.chat.completions.create(
        model="deepseek-ai/DeepSeek-V3.1-Terminus",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_data}
        ],
        response_format={"type": "json_object"}
    )

    clean_data = llm_response.choices[0].message.content
    print("\n--- PERFECTLY PARSED DATA ---")
    print(clean_data)

    with open('clean_events.json', 'w', encoding='utf-8') as f:
        f.write(clean_data)

if __name__ == "__main__":
    scrape_and_parse_events()