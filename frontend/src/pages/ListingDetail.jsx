import React from "react";
import Layout from "../components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { listings } from "../mock";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Carousel, CarouselContent, CarouselItem } from "../components/ui/carousel";
import { MapPin, Users, BadgeIndianRupee, MessageSquare } from "lucide-react";

export default function ListingDetail(){
  const { id } = useParams();
  const nav = useNavigate();
  const item = listings.find(l=>l.id===id) || listings[0];

  return (
    <Layout>
      <section className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <Carousel className="w-full">
              <CarouselContent>
                {item.images.map((src, idx)=> (
                  <CarouselItem key={idx}>
                    <img src={src} alt={`${item.title}-${idx}`} className="w-full h-[320px] object-cover"/>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </Card>
          <div>
            <div className="flex items-center gap-2 mb-2">
              {item.plus && <Badge className="bg-blue-600">RackUp Plus</Badge>}
              <h1 className="text-2xl font-semibold">{item.title}</h1>
            </div>
            <div className="text-muted-foreground flex items-center gap-2 mb-2"><MapPin className="h-4 w-4"/> {item.locality}, {item.city}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Card><CardContent className="p-4 flex items-center gap-2"><Users className="h-4 w-4"/> Footfall: <b>{item.footfall}</b>/day</CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-2"><BadgeIndianRupee className="h-4 w-4"/> Exp. Revenue: <b>₹{item.expectedRevenue.toLocaleString()}</b>/mo</CardContent></Card>
            </div>
            <p className="mt-4 text-sm leading-6">{item.description}</p>

            <div className="mt-6 flex gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=>nav(`/chat/${item.id}`)}><MessageSquare className="h-4 w-4 mr-2"/> Chat with owner</Button>
              <Button variant="outline">Request Booking</Button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <img src={item.owner.avatar} alt={item.owner.name} className="h-10 w-10 rounded-full"/>
              <div>
                <div className="font-medium">{item.owner.name}</div>
                <div className="text-xs text-muted-foreground">{item.owner.city} • Verified seller</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}