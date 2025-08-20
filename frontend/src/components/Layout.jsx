import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, PlusCircle, MapPin, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { toast } from "../hooks/use-toast";
import { sellers } from "../mock";
import { AuthContext, AppContext } from "../App";
import { useToast } from "../hooks/use-toast";
import { Toaster } from "../components/ui/toaster";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";
import axios from "axios";
import { auth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup, hasFirebaseConfig } from "../lib/firebase";

const logoUrl = "https://customer-assets.emergentagent.com/job_50ed0618-bab3-4cb3-9417-e52f6145f8f7/artifacts/vr7b1plr_rackup_logo-removebg-preview.png";

export default function Layout({ children }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { user, setUser } = useContext(AuthContext);
  const { searchText, setSearchText } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [otpPhase, setOtpPhase] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmRes, setConfirmRes] = useState(null);
  useToast();

  useEffect(() => { if (user) setOpen(false); }, [user]);

  // Initialize invisible reCAPTCHA lazily
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    }
  };

  const exchangeToken = async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken();
    const { data } = await axios.post(`/auth/exchange`, { idToken });
    localStorage.setItem("ru_token", data.token);
    const profile = data.user || {};
    setUser({ id: profile.uid || "me", name: profile.name || sellers[0].name, phone: profile.phone, email: profile.email, avatar: profile.avatar || sellers[0].avatar });
    toast({ title: "Welcome to RackUp" });
  };

  const onSendOtp = async () => {
    if (!/^[0-9]{10}$/.test(phone)) {
      toast({ title: "Invalid number", description: "Enter a 10-digit mobile number" });
      return;
    }
    if (!hasFirebaseConfig) {
      toast({ title: "Firebase keys missing", description: "Add REACT_APP_FIREBASE_* in frontend/.env and restart" });
      return;
    }
    try {
      setSending(true);
      setupRecaptcha();
      const res = await signInWithPhoneNumber(auth, `+91${phone}`, window.recaptchaVerifier);
      setConfirmRes(res);
      setOtpPhase("verify");
      toast({ title: "OTP sent" });
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to send OTP", description: e?.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const onVerifyOtp = async () => {
    if (!confirmRes) return;
    try {
      const cred = await confirmRes.confirm(otp);
      await exchangeToken(cred.user);
    } catch (e) {
      console.error(e);
      toast({ title: "Incorrect OTP", description: e?.message || "Check code", variant: "destructive" });
    }
  };

  const googleLogin = async () => {
    if (!hasFirebaseConfig) {
      toast({ title: "Firebase keys missing", description: "Add REACT_APP_FIREBASE_* in frontend/.env and restart" });
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      await exchangeToken(res.user);
    } catch (e) {
      console.error(e);
      toast({ title: "Google sign-in failed", description: e?.message, variant: "destructive" });
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ru_token");
    toast({ title: "Logged out" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div id="recaptcha-container" />
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoUrl} alt="RackUp" className="h-8 w-8 rounded" />
            <span className="font-semibold text-xl">RackUp</span>
          </Link>

          <div className="flex-1 max-w-2xl mx-2 hidden md:flex items-center gap-2">
            <div className="flex items-center gap-2 w-full">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by city, locality"
                className="w-full"
              />
              <Button variant="secondary"><Search className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="hidden md:flex" onClick={() => nav("/post")}> <PlusCircle className="h-4 w-4 mr-2"/> Post Shelf</Button>
            {!user ? (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="bg-blue-600 hover:bg-blue-700">Login</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle>Login to RackUp</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="mobile" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="mobile">Mobile OTP</TabsTrigger>
                      <TabsTrigger value="google">Google</TabsTrigger>
                    </TabsList>
                    <TabsContent value="mobile" className="space-y-4 pt-4">
                      {otpPhase === "phone" && (
                        <div className="space-y-3">
                          <Label htmlFor="phone">Mobile Number</Label>
                          <Input id="phone" inputMode="numeric" maxLength={10} placeholder="Enter 10-digit number" value={phone} onChange={(e)=>setPhone(e.target.value.replace(/[^0-9]/g, ""))} />
                          <Button disabled={sending} className="bg-blue-600 hover:bg-blue-700 w-full" onClick={onSendOtp}>{sending ? "Sending..." : "Send OTP"}</Button>
                          {!hasFirebaseConfig && (
                            <p className="text-xs text-muted-foreground">Add Firebase keys in frontend/.env to enable real OTP. For now, this is disabled.</p>
                          )}
                        </div>
                      )}
                      {otpPhase === "verify" && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Enter 6-digit OTP sent to +91-{phone}</p>
                            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                              <InputOTPGroup>
                                {Array.from({ length: 6 }).map((_, i) => (
                                  <InputOTPSlot key={i} index={i} />
                                ))}
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <Button className="bg-blue-600 hover:bg-blue-700 w-full" onClick={onVerifyOtp}>Verify &amp; Continue</Button>
                          <Button variant="ghost" className="w-full" onClick={()=>setOtpPhase("phone")}>Use another number</Button>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="google" className="pt-4">
                      <Button className="bg-black text-white hover:bg-neutral-800 w-full" onClick={googleLogin}>Continue with Google</Button>
                      {!hasFirebaseConfig && (<p className="text-xs text-muted-foreground mt-2">Add Firebase keys in frontend/.env to enable Google sign-in.</p>)}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex items-center gap-2">
                <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
                <span className="hidden md:block text-sm">Hi, {user.name?.split(" ")[0]}</span>
                <Button size="icon" variant="ghost" onClick={logout}><LogOut className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search row */}
        <div className="px-4 pb-3 md:hidden">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by city, locality"
              className="w-full"
            />
            <Button variant="secondary"><Search className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-white mt-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={logoUrl} alt="RackUp" className="h-8 w-8 rounded" />
              <span className="font-semibold text-lg">RackUp</span>
            </div>
            <p className="text-sm text-muted-foreground">Rack rentals marketplace to place your brand on local shelves.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="#">About</Link></li>
              <li><Link to="#">Blog</Link></li>
              <li><Link to="#">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="#">Contact</Link></li>
              <li><Link to="#">Terms</Link></li>
              <li><Link to="#">Privacy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Get the app</h4>
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-black rounded-md"></div>
              <div className="h-10 w-32 bg-black rounded-md"></div>
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground pb-6">©2025 RackUp Pvt. Ltd</div>
      </footer>
      <Toaster />
    </div>
  );
}