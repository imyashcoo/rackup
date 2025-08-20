import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { listings, mockConversations, persist } from "../mock";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "../hooks/use-toast";
import { ArrowLeft, SendHorizonal } from "lucide-react";

export default function Chat(){
  const { listingId } = useParams();
  const nav = useNavigate();
  const item = useMemo(()=>{
    const drafts = persist.get("ru_drafts", []);
    return [...listings, ...drafts].find(l=>l.id===listingId) || listings[0];
  }, [listingId]);

  const [convos, setConvos] = useState(()=>persist.get("ru_convos", mockConversations));
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(()=>{ persist.set("ru_convos", convos); }, [convos]);
  useEffect(()=>{ endRef.current?.scrollIntoView({ behavior: "smooth"}); }, [convos]);

  const convo = convos.find(c=>c.listingId===item.id) || { id: `c_${item.id}`, listingId: item.id, buyerId: "me", ownerId: item.owner?.id || "uX", messages: [] };

  const send = () => {
    if(!text.trim()) return;
    const msg = { id: `m${Date.now()}`, sender: "me", text: text.trim(), ts: Date.now() };
    let next;
    if (convos.find(c=>c.listingId===item.id)) {
      next = convos.map(c=> c.listingId===item.id ? { ...c, messages: [...c.messages, msg] } : c);
    } else {
      next = [...convos, { ...convo, messages: [msg] }];
    }
    setConvos(next);
    setText("");
  };

  return (
    <Layout>
      <section className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" onClick={()=>nav(-1)}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardContent className="p-4 flex items-center gap-3">
              <img src={item.images[0]} alt={item.title} className="h-16 w-16 object-cover rounded"/>
              <div>
                <div className="font-semibold line-clamp-1">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.locality}, {item.city}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardContent className="p-0">
              <div className="h-[420px] flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  {(convo.messages || []).map(m => (
                    <div key={m.id} className={`flex ${m.sender==='me' ? 'justify-end' : 'justify-start'} mb-2`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${m.sender==='me' ? 'bg-blue-600 text-white' : 'bg-secondary'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </ScrollArea>
                <div className="p-3 border-t flex items-center gap-2">
                  <Input placeholder="Type a message" value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); send(); } }} />
                  <Button onClick={send} className="bg-blue-600 hover:bg-blue-700"><SendHorizonal className="h-4 w-4"/></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}