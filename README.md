# Rebel Radar 🎰📍

**Rebel Radar** is a mobile app built for the UNLV community helping students, faculty, and staff stay in the know about what's happening on campus. From club meetups and association events to the best food spots, Rebel Radar keeps you connected to campus life in real time.

---

## What It Does

Rebel Radar aggregates and displays events and activities happening at UNLV, organized across three categories:

- **Clubs** — Find out what student organizations are up to
- **Associations** — Stay informed on academic and professional group events
- **Food** — Discover dining options and food-related events on campus

It also features a **Hotspot Button**, which lets users drop a real-time alert at their location to notify others of something happening in the area; whether that's people soliciting on campus, a crowd, or any other alert worth sharing with fellow Rebels.

---

## Las Vegas & The Rebel Community

UNLV sits in the heart of Las Vegas, home to one of the most vibrant and fast-moving communities in the country. Rebel Radar was built with that energy in mind — giving UNLV's Rebel community a dedicated tool to navigate campus life with the same pulse and awareness that defines Las Vegas itself. Rebel Radar keeps you tapped into what's happening right now.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo) |
| Language | TypeScript |
| Backend & Database | Supabase |
| Data Scraping | Python |
| Data Parsing | DeepSeek AI |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [Expo Go](https://expo.dev/client) app on your mobile device (or an emulator)
- Python 3.x for running the scraper
- A Supabase project set up with the appropriate environment variables

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/rebel-radar.git
   cd rebel-radar
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the root directory and add your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the app:**
   ```bash
   npx expo start
   ```

   Then scan the QR code with Expo Go or launch in an emulator.

### Running the Scraper

Navigate to the scraper directory and run:
```bash
python scraper.py
```

---

## License

This project is licensed under the MIT License.
