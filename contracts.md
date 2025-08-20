# RackUp Full-stack Contracts (v1)

Purpose: Replace current mock-only frontend with a FastAPI + MongoDB backend, Firebase Phone (OTP) + optional Google Auth, and FastAPI WebSocket chat, while preserving URL/infra rules.

Key Decisions (as confirmed by you)
- OTP provider: Firebase Auth (Phone)
- Real-time chat: FastAPI WebSockets
- Brand: Poppins font + clean blue accent
- Seed locations from data.gov.in pincode CSV (states/cities)

Required Credentials from you
- Firebase Web config (for phone/Google on frontend):
  - apiKey, authDomain, projectId, appId, messagingSenderId (and optionally measurementId)
- Backend: Firebase projectId (to validate tokens) and JWKS URL (via Google)
- If you prefer Google Sign-In outside Firebase, share Google OAuth Web Client ID (web). Otherwise we’ll use Google sign-in via Firebase in the same project.

Collections (MongoDB)
- users: { _id, uid (firebase uid), name, phone, email, avatar, provider, createdAt }
- listings: { _id, ownerId, title, city, locality, category, images[], footfall, expectedRevenue, pricePerMonth, size, plus, description, createdAt, updatedAt, status }
- favorites: { _id, userId, listingId, createdAt }
- conversations: { _id, listingId, buyerId, ownerId, lastMessageAt, createdAt }
- messages: { _id, conversationId, senderId, text, ts }
- bookings: { _id, listingId, userId, note, status, createdAt }
- locations: { _id, state, city, pincode } with indexes on {state, city}

Endpoint Contracts (all prefixed with /api)
1) Auth
- POST /api/auth/exchange
  - desc: Exchange Firebase ID token for app JWT (stateless)
  - body: { idToken: string }
  - 200: { token: string, user: User }
  - 401: { error }
- GET /api/auth/me (Bearer token)
  - 200: { user }
- POST /api/auth/logout
  - 204

2) Listings
- POST /api/listings (auth)
  - body: { title, city, locality, category, images[], footfall, expectedRevenue, pricePerMonth, size, plus, description }
  - 201: Listing
- GET /api/listings
  - query: q, city, locality, category, plus (bool), minFootfall, maxPrice, page, limit
  - 200: { items: Listing[], page, limit, total }
- GET /api/listings/{id} -> 200: Listing
- PATCH /api/listings/{id} (auth owner) -> 200: Listing
- DELETE /api/listings/{id} (auth owner)
- POST /api/listings/{id}/favorite (auth) -> 200: { favorited: true }
- DELETE /api/listings/{id}/favorite (auth) -> 200: { favorited: false }

3) Bookings
- POST /api/bookings (auth)
  - body: { listingId, note }
  - 201: Booking
- GET /api/bookings?mine=true (auth) -> list

4) Conversations & Messages (REST fallback)
- GET /api/conversations (auth) -> 200: Conversation[] (optionally filter by listingId)
- POST /api/conversations (auth) -> body: { listingId, ownerId } -> 201: Conversation
- GET /api/conversations/{id}/messages (auth) -> 200: Message[] (paginated)
- POST /api/conversations/{id}/messages (auth) -> body: { text } -> 201: Message

5) WebSocket Chat
- WS /api/ws/chat?token=JWT&conversationId=...
  - client send: { type: "msg", text }
  - server broadcast: { type: "msg", message: Message }
  - heartbeats: { type: "ping" } / { type: "pong" }

6) Locations (states/cities from pincode CSV)
- POST /api/admin/locations/import (admin)
  - body: { source: "remote" | "file", url?, path? }
  - behavior: fetch CSV (remote URL you shared) or read server file; upsert locations with state/city/pincode. Builds indexes.
  - 202: { imported: number, states: number, cities: number }
- GET /api/locations/states -> 200: string[]
- GET /api/locations/cities?state=UP -> 200: string[]
- GET /api/locations/search?term=luck -> 200: { states: string[], cities: string[] }

Mapping of current mocks (src/mock.js) to backend
- listings[] -> listings collection
- sellers[] -> users (owner profiles)
- mockConversations[] -> conversations + messages
- localities[] -> locations (derived from pincode CSV; mock list will be removed)
- testimonials[] -> static JSON or testimonials collection (optional v2)

Frontend Integration Plan
1) Auth
- Install Firebase on frontend; initialize with provided config.
- Replace Login modal actions:
  - Phone: use RecaptchaVerifier + signInWithPhoneNumber; after confirm, get idToken and call POST /api/auth/exchange; store app JWT.
  - Google: signInWithPopup(GoogleProvider) under Firebase; exchange idToken similarly.
- Axios interceptor attaches Authorization: Bearer ${token} to all /api calls.

2) Listings/Filters
- Replace mock listing reads with GET /api/listings and query params.
- Post Shelf form -> POST /api/listings; image upload v2 (chunked) if required.

3) Chat
- On entering chat for a listing: ensure conversation exists (POST /api/conversations or GET list filtered).
- Connect WS to /api/ws/chat with current conversationId + JWT; append messages live; keep REST fallback for history and offline.

4) Locations
- Replace localities mock by calling /api/locations/states and /api/locations/cities?state=...
- Search bar uses /api/locations/search.

Data Validation & Errors
- pydantic models on backend; zod on frontend for forms.
- Standard error: { error: { code, message } } with 4xx/5xx.

Security
- Verify Firebase ID tokens server-side using Google public keys; mint short-lived JWT (HS256) with userId and roles. Store no server sessions.
- CORS remains broad initially; rate limit basic endpoints; sanitize image URLs.

Pagination/Sorting
- Default limit=12; cursor or page based.

Testing
- Backend: deep_testing_backend_v2 to validate all routes after implementation.
- Frontend: manual and playwright agent on pages (Home, Listing, Chat, Post, Auth flow with mocks swapped to Firebase sandbox during dev).

Timeline
- Day 1: Implement locations importer + listing CRUD + auth exchange; seed locations.
- Day 2: WebSocket chat + bookings + frontend swap from mocks.