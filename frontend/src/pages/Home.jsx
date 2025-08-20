import React, { useContext, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { listings as allListings, localities, testimonials, sellers } from "../mock";
import { AppContext } from "../App";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Sparkles, Eye, Heart, Share2, Users, Zap, Wallet } from "lucide-react";
import { toast } from "../hooks/use-toast";

const SectionTitle = ({children, action}) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-xl md:text-2xl font-semibold">{children}</h2>
    {action}
  </div>
);

const ListingCard = ({ item, onFav }) => {
  const nav = useNavigate();
  return (
    <Card className="overflow-hidden group">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        {item.plus && (
          <Badge className="absolute top-2 left-2 bg-blue-600">RackUp Plus</Badge>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          <Button size="icon" variant="secondary" className="bg-white/90" onClick={()=>onFav(item)}><Heart className="h-4 w-4"/></Button>
          <Button size="icon" variant="secondary" className="bg-white/90" onClick={()=>toast({title:"Share link copied (mock)"})}><Share2 className="h-4 w-4"/></Button>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold line-clamp-1">{item.title}</h3>
        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
          <MapPin className="h-4 w-4"/> {item.locality}, {item.city}
        </div>
        <div className="flex justify-between items-center mt-3 text-sm">
          <span>Footfall: <b>{item.footfall}</b>/day</span>
          <span>Revenue: <b>₹{item.expectedRevenue.toLocaleString()}</b>/mo</span>
        </div>
        <Button className="w-full mt-3 bg-blue-600 hover:bg-blue-700" onClick={()=>nav(`/listing/${item.id}`)}>
          <Eye className="h-4 w-4 mr-2"/> View Shelf Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default function Home() {
  const { searchText } = useContext(AppContext);
  const [favorites, setFavorites] = useState([]);

  const onFav = (it) => {
    setFavorites((f)=>{
      const exists = f.find((x)=>x.id===it.id);
      const next = exists ? f.filter(x=>x.id!==it.id) : [...f, it];
      toast({ title: exists ? "Removed from favorites" : "Added to favorites" });
      return next;
    })
  }

  const filtered = useMemo(() => {
    const q = (searchText || "").toLowerCase();
    return allListings.filter((l) =>
      [l.title, l.locality, l.city, l.category].some((t) => t.toLowerCase().includes(q))
    );
  }, [searchText]);

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold leading-tight">Get Your Brand on Local Shelves Instantly.</h1>
            <p className="text-muted-foreground mt-2">Discover and rent retail racks in high-footfall stores across your city.</p>
            <div className="mt-4 flex gap-3">
              <Link to="#market"><Button className="bg-blue-600 hover:bg-blue-700">Find Shelf</Button></Link>
              <Link to="/post"><Button variant="outline">Post Shelf</Button></Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="h-48 rounded-xl bg-white shadow-sm border flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-blue-600"/>
              <span className="ml-2 font-medium">RackUp Marketplace</span>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace */}
      <section id="market" className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <SectionTitle action={<Link to="#"><Button variant="ghost">View All</Button></Link>}>Marketplace (Browse Shelves)</SectionTitle>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ListingCard key={item.id} item={item} onFav={onFav} />
          ))}
        </div>
      </section>

      {/* Owner CTA */}
      <section className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 text-center">
          Are you an owner? Post Shelf For Free
        </div>
      </section>

      {/* Popular Localities */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <SectionTitle>Popular Localities</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {localities.map((loc) => (
            <Badge key={loc} variant="secondary" className="px-4 py-2 rounded-full">{loc}</Badge>
          ))}
        </div>
      </section>

      {/* Exclusive Listing Plus */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        <SectionTitle action={<Link to="#"><Button variant="ghost">View All</Button></Link>}>
          Exclusive Listing <span className="text-blue-600 ml-2">RackUP Plus</span>
        </SectionTitle>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allListings.filter((l)=>l.plus).map((item) => (
            <ListingCard key={item.id} item={item} onFav={onFav} />
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        <SectionTitle>Rack UP Benefits</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card><CardContent className="p-5 flex items-start gap-3"><Wallet className="h-6 w-6 text-blue-600"/><div><h4 className="font-semibold">Low-cost entry</h4><p className="text-sm text-muted-foreground">Affordable shelf placements</p></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-start gap-3"><Zap className="h-6 w-6 text-blue-600"/><div><h4 className="font-semibold">Instant market presence</h4><p className="text-sm text-muted-foreground">Quick retail visibility</p></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-start gap-3"><Users className="h-6 w-6 text-blue-600"/><div><h4 className="font-semibold">Boost awareness</h4><p className="text-sm text-muted-foreground">Reach local shoppers</p></div></CardContent></Card>
        </div>
      </section>

      {/* Recommended Sellers */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        <SectionTitle>Recommended Sellers</SectionTitle>
        <div className="grid sm:grid-cols-3 gap-4">
          {sellers.map((s)=> (
            <Card key={s.id}><CardContent className="p-4 flex items-center gap-3"><img className="h-10 w-10 rounded-full" src={s.avatar} alt={s.name}/><div><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.city}</div></div></CardContent></Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
        <SectionTitle>Testimonials</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {testimonials.map((t)=> (
            <Card key={t.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <img className="h-10 w-10 rounded-full" src={t.avatar} alt={t.name}/>
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.company}</div>
                  </div>
                </div>
                <p className="text-sm">{t.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </Layout>
  );
}