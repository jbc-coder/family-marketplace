import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Clock3, RefreshCcw, Tag, MapPin, User, Gavel, ShoppingCart, Trash2, CheckCircle2, Sparkles, AlertCircle, Package, HandCoins } from "lucide-react";

const STORAGE_KEY = "family-marketplace-mvp-v2";
const APP_NAME = "Family First Marketplace";
const APP_TAGLINE = "Give family first shot before it gets donated or consigned.";

const seedUsers = ["Jared", "Ashley", "Mom", "Dad", "Aunt Lisa", "Cousin Ben"];

const seedListings = [
  {
    id: crypto.randomUUID(),
    title: "Solid wood coffee table",
    description: "Good condition. A few scratches on the top but still sturdy and nice.",
    priceType: "paid",
    price: 75,
    pickup: "Front porch pickup in Highland Lake",
    seller: "Mom",
    category: "Furniture",
    photos: ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop"],
    allowOffers: true,
    allowBuyNow: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 4,
    status: "active",
    offers: [
      {
        id: crypto.randomUUID(),
        by: "Ashley",
        amount: 55,
        note: "Can pick up Saturday morning.",
        createdAt: Date.now() - 1000 * 60 * 60 * 2,
      },
    ],
    claimedBy: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Baby clothes bundle",
    description: "Mostly 3–6 month sizes. Free to a family member who can use them.",
    priceType: "free",
    price: 0,
    pickup: "Pickup in Birmingham next week or I can bring to family lunch.",
    seller: "Ashley",
    category: "Kids",
    photos: ["https://images.unsplash.com/photo-1519238359922-989348752efb?q=80&w=1200&auto=format&fit=crop"],
    allowOffers: false,
    allowBuyNow: true,
    createdAt: Date.now() - 1000 * 60 * 90,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 10,
    status: "active",
    offers: [],
    claimedBy: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Acoustic guitar stand",
    description: "Works fine. I switched to wall hangers and do not need this anymore.",
    priceType: "paid",
    price: 15,
    pickup: "Porch pickup only",
    seller: "Dad",
    category: "Music",
    photos: ["https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1200&auto=format&fit=crop"],
    allowOffers: true,
    allowBuyNow: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    expiresAt: Date.now() - 1000 * 60 * 60 * 6,
    status: "expired",
    offers: [],
    claimedBy: null,
  },
];

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

function getRemainingText(expiresAt) {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  return `${hours}h ${mins}m left`;
}

function getStatus(listing) {
  if (listing.status === "sold") return "sold";
  if (listing.status === "claimed") return "claimed";
  if (listing.expiresAt <= Date.now()) return "expired";
  return "active";
}

function statusTone(status) {
  if (status === "active") return "default";
  return "secondary";
}

function priceLabel(item) {
  return item.priceType === "free" ? "Free" : money(item.price);
}

export default function FamilyMarketplaceMVP() {
  const [currentUser, setCurrentUser] = useState("Jared");
  const [listings, setListings] = useState(seedListings);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedListing, setSelectedListing] = useState(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [notice, setNotice] = useState("");
  const [newListing, setNewListing] = useState({
    title: "",
    description: "",
    priceType: "paid",
    price: "",
    pickup: "",
    category: "General",
    photoUrl: "",
    allowOffers: true,
    allowBuyNow: true,
    expiresInDays: 14,
  });

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.listings?.length) setListings(parsed.listings);
        if (parsed?.currentUser) setCurrentUser(parsed.currentUser);
      } catch {}
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ listings, currentUser }));
  }, [listings, currentUser]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const timer = setInterval(() => {
      setListings((prev) =>
        prev.map((item) => {
          if (item.status === "sold" || item.status === "claimed") return item;
          if (item.expiresAt <= Date.now() && item.status !== "expired") {
            return { ...item, status: "expired" };
          }
          return item;
        })
      );
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => {
    const values = Array.from(new Set(listings.map((x) => x.category))).sort();
    return ["all", ...values];
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const matchesQuery = [item.title, item.description, item.seller, item.category]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "free" && item.priceType === "free") ||
        (typeFilter === "paid" && item.priceType === "paid");
      return matchesQuery && matchesCategory && matchesType;
    });
  }, [listings, query, categoryFilter, typeFilter]);

  const activeListings = filteredListings.filter((x) => getStatus(x) === "active");
  const activeAll = listings.filter((x) => getStatus(x) === "active");
  const freeCount = activeAll.filter((x) => x.priceType === "free").length;
  const saleCount = activeAll.filter((x) => x.priceType === "paid").length;
  const myListings = listings.filter((x) => x.seller === currentUser);
  const expiringSoon = listings.filter(
    (x) => getStatus(x) === "active" && x.expiresAt - Date.now() < 1000 * 60 * 60 * 24 * 2
  );
  const myOpenOffers = listings.reduce((sum, item) => sum + item.offers.filter((o) => o.by === currentUser).length, 0);

  function createListing() {
    if (!newListing.title || !newListing.description || !newListing.pickup) return;

    const listing = {
      id: crypto.randomUUID(),
      title: newListing.title,
      description: newListing.description,
      priceType: newListing.priceType,
      price: newListing.priceType === "free" ? 0 : Number(newListing.price || 0),
      pickup: newListing.pickup,
      seller: currentUser,
      category: newListing.category,
      photos: [
        newListing.photoUrl ||
          "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?q=80&w=1200&auto=format&fit=crop",
      ],
      allowOffers: newListing.priceType === "free" ? false : newListing.allowOffers,
      allowBuyNow: newListing.allowBuyNow,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * Number(newListing.expiresInDays),
      status: "active",
      offers: [],
      claimedBy: null,
    };

    setListings((prev) => [listing, ...prev]);
    setNewListing({
      title: "",
      description: "",
      priceType: "paid",
      price: "",
      pickup: "",
      category: "General",
      photoUrl: "",
      allowOffers: true,
      allowBuyNow: true,
      expiresInDays: 14,
    });
    setNotice(`Listing posted: ${listing.title}`);
  }

  function buyNow(id) {
    const item = listings.find((x) => x.id === id);
    setListings((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? { ...entry, status: entry.priceType === "free" ? "claimed" : "sold", claimedBy: currentUser }
          : entry
      )
    );
    if (selectedListing?.id === id) {
      setSelectedListing((prev) => ({
        ...prev,
        status: selectedListing.priceType === "free" ? "claimed" : "sold",
        claimedBy: currentUser,
      }));
    }
    if (item) {
      setNotice(item.priceType === "free" ? `You claimed: ${item.title}` : `You bought: ${item.title}`);
    }
  }

  function submitOffer(id) {
    const amount = Number(offerAmount);
    if (!amount) return;
    const nextOffer = {
      id: crypto.randomUUID(),
      by: currentUser,
      amount,
      note: offerNote,
      createdAt: Date.now(),
    };
    setListings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, offers: [nextOffer, ...item.offers] } : item))
    );
    if (selectedListing?.id === id) {
      setSelectedListing((prev) => ({ ...prev, offers: [nextOffer, ...prev.offers] }));
    }
    setOfferAmount("");
    setOfferNote("");
    setNotice("Offer submitted.");
  }

  function relist(id) {
    setListings((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "active",
              createdAt: Date.now(),
              expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 14,
            }
          : item
      )
    );
    setNotice("Listing relisted for 14 more days.");
  }

  function deleteListing(id) {
    const item = listings.find((x) => x.id === id);
    setListings((prev) => prev.filter((entry) => entry.id !== id));
    if (selectedListing?.id === id) setSelectedListing(null);
    if (item) setNotice(`Deleted: ${item.title}`);
  }

  function resetFilters() {
    setQuery("");
    setCategoryFilter("all");
    setTypeFilter("all");
  }

  function ListingCard({ item }) {
    const status = getStatus(item);
    const isOwner = item.seller === currentUser;
    return (
      <Card className="overflow-hidden rounded-2xl border-0 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img src={item.photos?.[0]} alt={item.title} className="h-full w-full object-cover" />
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" /> {item.seller}
              </div>
            </div>
            <Badge variant={statusTone(status)}>{status}</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{item.category}</Badge>
            <Badge variant="outline">{priceLabel(item)}</Badge>
            {item.allowOffers && status === "active" ? <Badge variant="outline">Offers on</Badge> : null}
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>

          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {item.pickup}</div>
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {getRemainingText(item.expiresAt)}</div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1 rounded-xl" variant="outline" onClick={() => setSelectedListing(item)}>
              View Details
            </Button>
            {status === "active" && !isOwner && item.allowBuyNow ? (
              <Button className="flex-1 rounded-xl" onClick={() => buyNow(item.id)}>
                {item.priceType === "free" ? "Claim It" : "Buy Now"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" /> Private family-only marketplace
                  </div>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{APP_NAME}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{APP_TAGLINE}</p>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Post an item</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Let family claim or offer</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Auto-expire stale listings</div>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <Card className="rounded-2xl shadow-none">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{activeAll.length}</div>
                      <div className="text-xs text-muted-foreground">Active now</div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl shadow-none">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{freeCount}</div>
                      <div className="text-xs text-muted-foreground">Free items</div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl shadow-none">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{saleCount}</div>
                      <div className="text-xs text-muted-foreground">For sale</div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl shadow-none">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">{expiringSoon.length}</div>
                      <div className="text-xs text-muted-foreground">Expiring soon</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardContent className="flex h-full flex-col justify-between p-6">
              <div>
                <Label className="text-sm text-muted-foreground">Viewing as</Label>
                <Select value={currentUser} onValueChange={setCurrentUser}>
                  <SelectTrigger className="mt-2 rounded-xl">
                    <SelectValue placeholder="Choose family member" />
                  </SelectTrigger>
                  <SelectContent>
                    {seedUsers.map((name) => (
                      <SelectItem value={name} key={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-medium">Quick view for {currentUser}</div>
                <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{myListings.length}</div>
                    <div>My listings</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{myOpenOffers}</div>
                    <div>My offers</div>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                This version is polished for family use, but still runs locally in the browser. Next, we convert it into a shared live app.
              </p>
            </CardContent>
          </Card>
        </div>

        {notice ? (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> {notice}
          </div>
        ) : null}

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1 md:w-[560px]">
            <TabsTrigger value="browse" className="rounded-xl">Browse Listings</TabsTrigger>
            <TabsTrigger value="create" className="rounded-xl">Post an Item</TabsTrigger>
            <TabsTrigger value="manage" className="rounded-xl">My Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-5">
            <Card className="rounded-3xl shadow-sm">
              <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px_180px_auto] md:p-5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by item, seller, or category"
                    className="rounded-xl pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All items</SelectItem>
                    <SelectItem value="paid">For sale</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="rounded-xl" onClick={resetFilters}>Reset</Button>
              </CardContent>
            </Card>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {activeListings.length ? (
                activeListings.map((item) => <ListingCard key={item.id} item={item} />)
              ) : (
                <Card className="col-span-full rounded-3xl">
                  <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground">
                    <Package className="h-8 w-8" />
                    <div className="text-base font-medium text-slate-900">No listings match those filters</div>
                    <div className="max-w-md text-sm">Try clearing the filters or come back later when someone posts something new.</div>
                    <Button variant="outline" className="rounded-xl" onClick={resetFilters}>Clear filters</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="create">
            <Card className="rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl"><Plus className="h-5 w-5" /> Post an item for the family</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-muted-foreground">
                    Keep it simple: add a clear title, a short honest description, and pickup instructions. Listings expire automatically so stale items do not pile up.
                  </div>
                  <div>
                    <Label>Item title</Label>
                    <Input className="mt-2 rounded-xl" value={newListing.title} onChange={(e) => setNewListing({ ...newListing, title: e.target.value })} placeholder="Coffee table, stroller, drill set..." />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea className="mt-2 min-h-[140px] rounded-xl" value={newListing.description} onChange={(e) => setNewListing({ ...newListing, description: e.target.value })} placeholder="Condition, size, brand, wear, and anything family should know before claiming it." />
                  </div>
                  <div>
                    <Label>Photo URL</Label>
                    <Input className="mt-2 rounded-xl" value={newListing.photoUrl} onChange={(e) => setNewListing({ ...newListing, photoUrl: e.target.value })} placeholder="Paste an image URL for this MVP" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Listing type</Label>
                      <Select value={newListing.priceType} onValueChange={(value) => setNewListing({ ...newListing, priceType: value })}>
                        <SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">For sale</SelectItem>
                          <SelectItem value="free">Free</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input className="mt-2 rounded-xl" value={newListing.category} onChange={(e) => setNewListing({ ...newListing, category: e.target.value })} placeholder="Furniture" />
                    </div>
                  </div>

                  {newListing.priceType === "paid" ? (
                    <div>
                      <Label>Asking price</Label>
                      <Input className="mt-2 rounded-xl" type="number" value={newListing.price} onChange={(e) => setNewListing({ ...newListing, price: e.target.value })} placeholder="75" />
                    </div>
                  ) : null}

                  <div>
                    <Label>Pickup details</Label>
                    <Textarea className="mt-2 rounded-xl" value={newListing.pickup} onChange={(e) => setNewListing({ ...newListing, pickup: e.target.value })} placeholder="Porch pickup, town, available days, meetup options, or whether you can bring it to the next family gathering." />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label>Expires in days</Label>
                      <Input className="mt-2 rounded-xl" type="number" value={newListing.expiresInDays} onChange={(e) => setNewListing({ ...newListing, expiresInDays: e.target.value })} />
                    </div>
                    <div>
                      <Label>Buy now / claim</Label>
                      <Select value={newListing.allowBuyNow ? "yes" : "no"} onValueChange={(v) => setNewListing({ ...newListing, allowBuyNow: v === "yes" })}>
                        <SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Enabled</SelectItem>
                          <SelectItem value="no">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Offers</Label>
                      <Select value={newListing.allowOffers ? "yes" : "no"} onValueChange={(v) => setNewListing({ ...newListing, allowOffers: v === "yes" })}>
                        <SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Enabled</SelectItem>
                          <SelectItem value="no">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button className="w-full rounded-2xl" onClick={createListing}>Publish listing</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle>My listings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {myListings.length ? myListings.map((item) => {
                    const status = getStatus(item);
                    return (
                      <div key={item.id} className="rounded-2xl border bg-white p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{item.title}</h3>
                              <Badge variant="outline">{status}</Badge>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {priceLabel(item)} · {item.category}
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">Expires: {formatDate(item.expiresAt)}</div>
                            <div className="mt-1 text-sm text-muted-foreground">Offers received: {item.offers.length}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {status === "expired" ? (
                              <Button variant="outline" className="rounded-xl" onClick={() => relist(item.id)}>
                                <RefreshCcw className="mr-2 h-4 w-4" /> Relist
                              </Button>
                            ) : null}
                            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedListing(item)}>View</Button>
                            <Button variant="destructive" className="rounded-xl" onClick={() => deleteListing(item.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                      You have not posted anything yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle>How this version works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>• Browse current family listings</div>
                  <div>• Post an item with title, price or free status, pickup details, and expiration</div>
                  <div>• Claim an item immediately or submit an offer</div>
                  <div>• Expired items can be relisted with one click</div>
                  <div>• Data stays saved in the browser for this demo</div>
                  <Separator className="my-3" />
                  <div className="font-medium text-slate-900">To actually go live for the family today:</div>
                  <div>• Add shared backend + database</div>
                  <div>• Add simple invite-only sign-in</div>
                  <div>• Replace photo URL input with image upload</div>
                  <div>• Deploy to Vercel or Netlify</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedListing} onOpenChange={(open) => !open && setSelectedListing(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl p-0">
          {selectedListing ? (
            <div className="grid max-h-[90vh] md:grid-cols-[1.1fr_0.9fr]">
              <div className="bg-black/5">
                <img src={selectedListing.photos?.[0]} alt={selectedListing.title} className="h-full max-h-[420px] w-full object-cover md:max-h-[90vh]" />
              </div>
              <ScrollArea className="max-h-[90vh]">
                <div className="p-6">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">{selectedListing.title}</DialogTitle>
                  </DialogHeader>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant={statusTone(getStatus(selectedListing))}>{getStatus(selectedListing)}</Badge>
                    <Badge variant="outline">{selectedListing.category}</Badge>
                    <Badge variant="outline">{priceLabel(selectedListing)}</Badge>
                    {selectedListing.allowOffers && getStatus(selectedListing) === "active" ? <Badge variant="outline">Offers enabled</Badge> : null}
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /> Seller: {selectedListing.seller}</div>
                    <div className="flex items-center gap-2 text-muted-foreground"><Clock3 className="h-4 w-4" /> Expires: {formatDate(selectedListing.expiresAt)} ({getRemainingText(selectedListing.expiresAt)})</div>
                    <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {selectedListing.pickup}</div>
                  </div>

                  <p className="mt-5 text-sm leading-6 text-slate-700">{selectedListing.description}</p>

                  {getStatus(selectedListing) === "active" && selectedListing.seller !== currentUser ? (
                    <div className="mt-6 space-y-5">
                      {selectedListing.allowBuyNow ? (
                        <Button className="w-full rounded-2xl" onClick={() => buyNow(selectedListing.id)}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {selectedListing.priceType === "free" ? "Claim item" : `Buy now for ${money(selectedListing.price)}`}
                        </Button>
                      ) : null}

                      {selectedListing.allowOffers ? (
                        <Card className="rounded-2xl shadow-none">
                          <CardContent className="space-y-3 p-4">
                            <div className="flex items-center gap-2 font-medium"><HandCoins className="h-4 w-4" /> Make an offer</div>
                            <Input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="Offer amount" className="rounded-xl" />
                            <Textarea value={offerNote} onChange={(e) => setOfferNote(e.target.value)} placeholder="Optional note: pickup timing, bundle request, or any extra context." className="rounded-xl" />
                            <Button className="w-full rounded-xl" variant="outline" onClick={() => submitOffer(selectedListing.id)}>
                              Submit offer
                            </Button>
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedListing.claimedBy ? (
                    <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm">
                      This item has been {selectedListing.priceType === "free" ? "claimed" : "purchased"} by <span className="font-semibold">{selectedListing.claimedBy}</span>.
                    </div>
                  ) : null}

                  {selectedListing.seller === currentUser && selectedListing.offers?.length > 0 ? (
                    <div className="mt-5 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <AlertCircle className="h-4 w-4" /> You have {selectedListing.offers.length} offer{selectedListing.offers.length === 1 ? "" : "s"} on this item.
                    </div>
                  ) : null}

                  <Separator className="my-5" />

                  <div>
                    <div className="mb-3 flex items-center gap-2 font-medium"><Tag className="h-4 w-4" /> Offer history</div>
                    <div className="space-y-3">
                      {selectedListing.offers?.length ? selectedListing.offers.map((offer) => (
                        <div key={offer.id} className="rounded-2xl border p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">{offer.by}</div>
                            <div>{money(offer.amount)}</div>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{formatDate(offer.createdAt)}</div>
                          {offer.note ? <div className="mt-2 text-muted-foreground">{offer.note}</div> : null}
                        </div>
                      )) : (
                        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No offers yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
          </a>
        </div>
      </main>
    </div>
  );
}
