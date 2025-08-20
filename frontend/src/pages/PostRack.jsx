import React, { useContext, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { useNavigate } from "react-router-dom";
import { toast } from "../hooks/use-toast";
import axios from "axios";
import { AppContext, AuthContext } from "../App";

export default function PostRack(){
  const nav = useNavigate();
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState({
    title: "",
    city: "Lucknow",
    locality: "Gomti Nagar",
    footfall: 1000,
    expectedRevenue: 25000,
    pricePerMonth: 5000,
    size: "4 ft x 2 ft",
    category: "General",
    plus: false,
    images: [],
    description: ""
  });
  const [imageUrls, setImageUrls] = useState("");

  const submit = async () => {
    if(!user) { toast({ title: "Please login to post"}); return; }
    const urls = imageUrls.split(/\n|,\s*/).map(s=>s.trim()).filter(Boolean);
    if(urls.length === 0) { toast({ title: "Add image URLs (one per line)"}); return; }
    try {
      const body = { ...form, images: urls };
      const { data } = await axios.post(`/listings`, body);
      toast({ title: "Shelf posted" });
      nav(`/listing/${data.id}`);
    } catch (e) {
      toast({ title: "Failed to post", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <section className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <h1 className="text-2xl font-semibold mb-4">Post Shelf</h1>
        <Card>
          <CardContent className="p-6 grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e)=>setForm({ ...form, title: e.target.value })} placeholder="e.g., Premium rack near billing counter"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e)=>setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label>Locality</Label>
                  <Input value={form.locality} onChange={(e)=>setForm({ ...form, locality: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Footfall / day</Label>
                  <Input type="number" value={form.footfall} onChange={(e)=>setForm({ ...form, footfall: parseInt(e.target.value||"0") })}/>
                </div>
                <div>
                  <Label>Expected Revenue / month (₹)</Label>
                  <Input type="number" value={form.expectedRevenue} onChange={(e)=>setForm({ ...form, expectedRevenue: parseInt(e.target.value||"0") })}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price / month (₹)</Label>
                  <Input type="number" value={form.pricePerMonth} onChange={(e)=>setForm({ ...form, pricePerMonth: parseInt(e.target.value||"0") })}/>
                </div>
                <div>
                  <Label>Size</Label>
                  <Input value={form.size} onChange={(e)=>setForm({ ...form, size: e.target.value })}/>
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e)=>setForm({ ...form, category: e.target.value })}/>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="plus" checked={form.plus} onCheckedChange={(c)=>setForm({ ...form, plus: c })}/>
                <Label htmlFor="plus">Mark as RackUp Plus</Label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Image URLs (one per line)</Label>
                <Textarea rows={6} value={imageUrls} onChange={(e)=>setImageUrls(e.target.value)} placeholder="https://...jpg\nhttps://...jpg"/>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={6} value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} placeholder="Describe the location, visibility, nearby counters, and power availability"/>
              </div>
              <div className="pt-2">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={submit}>Submit for Review</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}