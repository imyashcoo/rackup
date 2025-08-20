import React, { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "../hooks/use-toast";
import { ArrowLeft, SendHorizonal } from "lucide-react";
import axios from "axios";

export default function Chat(){
  const { listingId } = useParams();
  const nav = useNavigate();
  const [item, setItem] = useState(null);
  const [cid, setCid] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({ behavior: "smooth"}); }, [messages]);

  useEffect(()=>{
    const init = async () => {
      try {
        const lres = await axios.get(`/listings/${listingId}`);
        setItem(lres.data);
        const cres = await axios.post(`/conversations`, { listingId, ownerId: lres.data.ownerId });
        setCid(cres.data.id);
        const mres = await axios.get(`/conversations/${cres.data.id}/messages`);
        setMessages(mres.data || []);
        // open websocket
        const base = process.env.REACT_APP_BACKEND_URL;
        const wsURL = base.replace(/^http/, 'ws') + `/api/ws/chat?token=${localStorage.getItem('ru_token')}&conversationId=${cres.data.id}`;
        const ws = new WebSocket(wsURL);
        ws.onmessage = (ev) => {
          try { const data = JSON.parse(ev.data); if(data.type==='msg'){ setMessages((p)=>[...p, data.message]); } } catch {}
        };
        wsRef.current = ws;
      } catch (e) {
        console.error(e);
        toast({ title: "Chat init failed", description: e?.message, variant: "destructive" });
      }
    };
    init();
    return () => { wsRef.current?.close(); };
  }, [listingId]);

  const send = async () => {
    if(!text.trim() || !cid) return;
    try {
      wsRef.current?.send(JSON.stringify({ type: 'msg', text }));
      setText("");
    } catch (e) {
      // fallback REST
      await axios.post(`/conversations/${cid}/messages`, null, { params: { text } });
      setText("");
    }
  };

  if(!item) return <Layout><section className="max-w-5xl mx-auto px-4 md:px-6 py-6">Loading...</section></Layout>

  return (
    <Layout>
      <section className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" onClick={()=>nav(-1)}><ArrowLeft className="h-4 w-4 mr-2"/>Back</Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardContent className="p-4 flex items-center gap-3">
              <img src={item.images?.[0]} alt={item.title} className="h-16 w-16 object-cover rounded"/>
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
                  {(messages || []).map(m => (
                    <div key={m.id} className={`flex ${m.senderId===localStorage.getItem('ru_user')?.id ? 'justify-end' : 'justify-start'} mb-2`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${m.senderId===JSON.parse(localStorage.getItem('ru_user')||'{}').id ? 'bg-blue-600 text-white' : 'bg-secondary'}`}>
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