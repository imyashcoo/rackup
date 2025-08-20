/* Mock data for RackUp (OLX-style rack rental marketplace)
   NOTE: Replace via backend later. This file is the single source of truth for mocked content. */

export const localities = [
  "Gomti Nagar",
  "Indira Nagar",
  "Mahanagar",
  "Chinhat",
  "Aliganj",
  "Hazratganj",
  "Aminabad",
  "Vikas Nagar"
];

export const sellers = [
  {
    id: "u1",
    name: "Sidharth Singh",
    city: "Gomti Nagar",
    avatar: "https://i.pravatar.cc/100?img=1",
    verified: true
  },
  {
    id: "u2",
    name: "Aman Khare",
    city: "Aminabad",
    avatar: "https://i.pravatar.cc/100?img=2",
    verified: true
  },
  {
    id: "u3",
    name: "Aradhana Bandey",
    city: "Mahanagar",
    avatar: "https://i.pravatar.cc/100?img=3",
    verified: true
  }
];

export const listings = [
  {
    id: "r1",
    title: "Wooden Shelf in Walnut Bakery",
    images: [
      "https://images.unsplash.com/photo-1598300183295-84a0a88844ff?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop"
    ],
    locality: "Gomti Nagar",
    city: "Lucknow",
    footfall: 950,
    expectedRevenue: 30000,
    pricePerMonth: 4500,
    size: "4 ft x 2 ft",
    owner: sellers[0],
    plus: false,
    category: "Bakery",
    description:
      "Prime corner rack inside a busy bakery. Ideal for packaged foods, chocolates and impulse products. Power socket available."
  },
  {
    id: "r2",
    title: "Metal Shelf in Speed Wagon",
    images: [
      "https://images.unsplash.com/photo-1544989164-31dc3c645987?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1200&auto=format&fit=crop"
    ],
    locality: "Indira Nagar",
    city: "Lucknow",
    footfall: 1400,
    expectedRevenue: 50000,
    pricePerMonth: 7500,
    size: "5 ft x 2.5 ft",
    owner: sellers[1],
    plus: true,
    category: "General Store",
    description:
      "High visibility rack near billing counter in a convenience store. Great for FMCG and accessories."
  },
  {
    id: "r3",
    title: "Hanging Shelf in FashionHouse",
    images: [
      "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop"
    ],
    locality: "Mahanagar",
    city: "Lucknow",
    footfall: 1200,
    expectedRevenue: 42000,
    pricePerMonth: 6200,
    size: "3 ft x 1.5 ft",
    owner: sellers[2],
    plus: true,
    category: "Fashion",
    description:
      "Elegant hanging shelf with spotlighting inside a premium boutique. Perfect for cosmetics and accessories."  
  },
  {
    id: "r4",
    title: "Wooden Shelf in FestiStore",
    images: [
      "https://images.unsplash.com/photo-1543168256-418811576931?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503341733017-1901578f9b1f?q=80&w=1200&auto=format&fit=crop"
    ],
    locality: "Chinhat",
    city: "Lucknow",
    footfall: 800,
    expectedRevenue: 22000,
    pricePerMonth: 3500,
    size: "4 ft x 2 ft",
    owner: sellers[0],
    plus: false,
    category: "Variety",
    description:
      "Seasonal store with high festival rush. Rack sits right next to entry aisle."
  }
];

export const testimonials = [
  {
    id: "t1",
    name: "Rishabh Arora",
    company: "Cafebyte",
    rating: 5,
    avatar: "https://i.pravatar.cc/100?img=12",
    text:
      "RackUp gave our brand instant visibility in local shops. We started seeing sales in the very first week!"
  },
  {
    id: "t2",
    name: "Khushi Sharma",
    company: "GlowUp Cosmetics",
    rating: 5,
    avatar: "https://i.pravatar.cc/100?img=32",
    text:
      "Within weeks, our storefront presence doubled and we got better engagement at retail touchpoints."
  }
];

export const mockConversations = [
  {
    id: "c1",
    listingId: "r2",
    buyerId: "me",
    ownerId: "u2",
    messages: [
      { id: "m1", sender: "me", text: "Hi! Is the rack available from next week?", ts: Date.now() - 86400000 },
      { id: "m2", sender: "u2", text: "Yes, it is available. What brand do you want to place?", ts: Date.now() - 86300000 }
    ]
  }
];

// Utility to persist in localStorage for the mock chat
export const persist = {
  get(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ } }
};