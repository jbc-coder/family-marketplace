"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Offer = {
  id: string;
  by: string;
  amount: number;
  note: string;
  createdAt: number;
};

type Listing = {
  id: string;
  title: string;
  description: string;
  price_type: "paid" | "free";
  price: number;
  pickup: string;
  seller: string;
  category: string;
  photos: string[];
  allow_offers: boolean;
  allow_buy_now: boolean;
  created_at: string;
  expires_at: string;
  status: "active" | "expired" | "sold" | "claimed";
  offers: Offer[];
  claimed_by: string | null;
};

const APP_NAME = "Family First Marketplace";
const APP_TAGLINE = "Give family first shot before it gets donated or consigned.";

const seedUsers = ["Jared", "Ashley", "Mom", "Dad", "Aunt Lisa", "Cousin Ben"];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString();
}

function getRemainingText(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  return `${hours}h ${mins}m left`;
}

function getStatus(listing: Listing) {
  if (listing.status === "sold") return "sold";
  if (listing.status === "claimed") return "claimed";
  if (new Date(listing.expires_at).getTime() <= Date.now()) return "expired";
  return "active";
}

function badgeClass(status: string) {
  if (status === "active") return "bg-emerald-100 text-emerald-800";
  if (status === "sold") return "bg-slate-200 text-slate-700";
  if (status === "claimed") return "bg-blue-100 text-blue-800";
  return "bg-amber-100 text-amber-800";
}

export default function Page() {
  const [currentUser, setCurrentUser] = useState("Jared");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"browse" | "create" | "manage">("browse");
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
const [uploadingImage, setUploadingImage] = useState(false);
  async function loadListings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setListings(data as Listing[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

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
        (typeFilter === "free" && item.price_type === "free") ||
        (typeFilter === "paid" && item.price_type === "paid");

      return matchesQuery && matchesCategory && matchesType;
    });
  }, [listings, query, categoryFilter, typeFilter]);

const activeListings = filteredListings.filter(
  (x) => getStatus(x) === "active" && x.status !== "sold" && x.status !== "claimed"
);
  const activeAll = listings.filter((x) => getStatus(x) === "active");
  const freeCount = activeAll.filter((x) => x.price_type === "free").length;
  const saleCount = activeAll.filter((x) => x.price_type === "paid").length;
  const myListings = listings.filter((x) => x.seller === currentUser);
  const expiringSoon = listings.filter(
    (x) => getStatus(x) === "active" && new Date(x.expires_at).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 2
  );
  const myOpenOffers = listings.reduce(
    (sum, item) => sum + (item.offers || []).filter((o) => o.by === currentUser).length,
    0
  );
async function uploadListingImage(file: File) {
  setUploadingImage(true);

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from("listing-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    setUploadingImage(false);
    setNotice(`Image upload failed: ${uploadError.message}`);
    return;
  }

  const { data } = supabase.storage.from("listing-images").getPublicUrl(filePath);

  setNewListing((prev) => ({
    ...prev,
    photoUrl: data.publicUrl,
  }));

  setUploadingImage(false);
  setNotice("Image uploaded.");
}
  async function createListing() {
if (!newListing.title || !newListing.description || !newListing.pickup) {
  setNotice("Please fill in title, description, and pickup details.");
  return;
}
    const payload = {
      title: newListing.title,
      description: newListing.description,
      price_type: newListing.priceType,
      price: newListing.priceType === "free" ? 0 : Number(newListing.price || 0),
      pickup: newListing.pickup,
      seller: currentUser,
      category: newListing.category,
      photos: [
        newListing.photoUrl ||
          "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?q=80&w=1200&auto=format&fit=crop",
      ],
      allow_offers: newListing.priceType === "free" ? false : newListing.allowOffers,
      allow_buy_now: newListing.allowBuyNow,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * Number(newListing.expiresInDays)).toISOString(),
      status: "active",
      offers: [],
      claimed_by: null,
    };

    const { error } = await supabase.from("listings").insert(payload);

    if (!error) {
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
      setNotice(`Listing posted: ${payload.title}`);
      setTab("browse");
      loadListings();
    } else {
      setNotice(`Error: ${error.message}`);
    }
  }

  async function buyNow(id: string) {
    const item = listings.find((x) => x.id === id);
    if (!item) return;

    const nextStatus = item.price_type === "free" ? "claimed" : "sold";

    const { error } = await supabase
      .from("listings")
      .update({ status: nextStatus, claimed_by: currentUser })
      .eq("id", id);

    if (!error) {
      setSelectedListing(null);
      setNotice(item.price_type === "free" ? `You claimed: ${item.title}` : `You bought: ${item.title}`);
      loadListings();
    } else {
      setNotice(`Error: ${error.message}`);
    }
  }

  async function submitOffer(id: string) {
    const amount = Number(offerAmount);
    if (!amount) return;

    const item = listings.find((x) => x.id === id);
    if (!item) return;

    const nextOffer: Offer = {
      id: crypto.randomUUID(),
      by: currentUser,
      amount,
      note: offerNote,
      createdAt: Date.now(),
    };

    const nextOffers = [nextOffer, ...(item.offers || [])];

    const { error } = await supabase
      .from("listings")
      .update({ offers: nextOffers })
      .eq("id", id);

    if (!error) {
      setOfferAmount("");
      setOfferNote("");
      setNotice("Offer submitted.");
      loadListings();
    } else {
      setNotice(`Error: ${error.message}`);
    }
  }

async function relist(id: string) {
  const { error } = await supabase
    .from("listings")
    .update({
      status: "active",
      claimed_by: null,
      offers: [],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    })
    .eq("id", id);

  if (!error) {
    setNotice("Listing relisted for 14 more days.");
    loadListings();
  } else {
    setNotice(`Error: ${error.message}`);
  }
}
  async function deleteListing(id: string) {
    const item = listings.find((x) => x.id === id);

    const { error } = await supabase.from("listings").delete().eq("id", id);

    if (!error) {
      if (selectedListing?.id === id) setSelectedListing(null);
      if (item) setNotice(`Deleted: ${item.title}`);
      loadListings();
    } else {
      setNotice(`Error: ${error.message}`);
    }
  }

  function resetFilters() {
    setQuery("");
    setCategoryFilter("all");
    setTypeFilter("all");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
        <section className="mb-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Private family-only marketplace
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{APP_NAME}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">{APP_TAGLINE}</p>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                  <div>✓ Post an item</div>
                  <div>✓ Let family claim or offer</div>
                  <div>✓ Auto-expire stale listings</div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Active now", value: activeAll.length },
                  { label: "Free items", value: freeCount },
                  { label: "For sale", value: saleCount },
                  { label: "Expiring soon", value: expiringSoon.length },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <label className="text-sm text-slate-500">Viewing as</label>
            <select
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
            >
              {seedUsers.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-medium">Quick view for {currentUser}</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-500">
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

            <p className="mt-4 text-sm text-slate-500">
              Shared live data is now powered by Supabase.
            </p>
          </div>
        </section>

        {notice ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        ) : null}

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["browse", "Browse Listings"],
            ["create", "Post an Item"],
            ["manage", "My Listings"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value as "browse" | "create" | "manage")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                tab === value ? "bg-slate-900 text-white" : "bg-white text-slate-700 shadow-sm"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "browse" && (
          <section className="space-y-5">
            <div className="rounded-3xl bg-white p-4 shadow-sm md:p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_220px_180px_auto]">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by item, seller, or category"
                  className="rounded-xl border border-slate-300 px-3 py-2"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="all">All items</option>
                  <option value="paid">For sale</option>
                  <option value="free">Free</option>
                </select>
                <button onClick={resetFilters} className="rounded-xl border border-slate-300 bg-white px-4 py-2">
                  Reset
                </button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm">
                Loading listings...
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {activeListings.length ? (
                  activeListings.map((item) => {
                    const status = getStatus(item);
                    const isOwner = item.seller === currentUser;
                    return (
                      <article key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                        <div className="aspect-[4/3] bg-slate-100">
                          <img src={item.photos?.[0]} alt={item.title} className="h-full w-full object-cover" />
                        </div>

                        <div className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold leading-tight">{item.title}</h3>
                              <div className="mt-1 text-sm text-slate-500">{item.seller}</div>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass(status)}`}>
                              {status}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{item.category}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                              {item.price_type === "free" ? "Free" : money(item.price)}
                            </span>
                            {item.allow_offers && status === "active" ? (
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">Offers on</span>
                            ) : null}
                          </div>

                          <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>

                          <div className="space-y-1 text-sm text-slate-500">
                            <div>{item.pickup}</div>
                            <div>{getRemainingText(item.expires_at)}</div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              className="flex-1 rounded-xl border border-slate-300 px-4 py-2"
                              onClick={() => setSelectedListing(item)}
                            >
                              View Details
                            </button>
                            {status === "active" && !isOwner && item.allow_buy_now ? (
                              <button
                                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-white"
                                onClick={() => buyNow(item.id)}
                              >
                                {item.price_type === "free" ? "Claim It" : "Buy Now"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="col-span-full rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm">
                    <div className="text-base font-medium text-slate-900">No listings match those filters</div>
                    <div className="mt-2 text-sm">Try clearing the filters or come back later.</div>
                    <button
                      onClick={resetFilters}
                      className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

{tab === "create" && (
  <section className="rounded-3xl bg-white shadow-sm">
    <div className="border-b border-slate-200 p-6">
      <h2 className="text-2xl font-semibold">Post an item for the family</h2>
    </div>

    <div className="grid gap-6 p-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Keep it simple: add a clear title, a short honest description, and pickup instructions.
        </div>

        <div>
          <label className="block text-sm font-medium">Item title</label>
          <input
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
            value={newListing.title}
            onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
            placeholder="Coffee table, stroller, drill set..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="mt-2 min-h-[140px] w-full rounded-xl border border-slate-300 px-3 py-2"
            value={newListing.description}
            onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
            placeholder="Condition, size, brand, wear, and anything family should know before claiming it."
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Photo upload</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
            onChange={async (e) => {
              const file = e.target.files?.[0];

              if (!file) return;

              const validTypes = ["image/jpeg", "image/png", "image/webp"];
              if (!validTypes.includes(file.type)) {
                setNotice("Please upload JPG, JPEG, PNG, or WebP images.");
                return;
              }

              await uploadListingImage(file);
            }}
          />
          <p className="mt-2 text-sm text-slate-500">
            Use JPG, JPEG, PNG, or WebP. iPhone HEIC photos are not supported yet.
          </p>
          {uploadingImage ? (
            <p className="mt-2 text-sm text-slate-500">Uploading image...</p>
          ) : null}
          {newListing.photoUrl ? (
            <div className="mt-3">
              <img
                src={newListing.photoUrl}
                alt="Preview"
                className="h-32 w-32 rounded-xl object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Listing type</label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={newListing.priceType}
              onChange={(e) => setNewListing({ ...newListing, priceType: e.target.value })}
            >
              <option value="paid">For sale</option>
              <option value="free">Free</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Category</label>
            <input
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={newListing.category}
              onChange={(e) => setNewListing({ ...newListing, category: e.target.value })}
              placeholder="Furniture"
            />
          </div>
        </div>

        {newListing.priceType === "paid" ? (
          <div>
            <label className="block text-sm font-medium">Asking price</label>
            <input
              type="number"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={newListing.price}
              onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
              placeholder="75"
            />
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium">Pickup details</label>
          <textarea
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
            value={newListing.pickup}
            onChange={(e) => setNewListing({ ...newListing, pickup: e.target.value })}
            placeholder="Porch pickup, town, available days, meetup options..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium">Expires in days</label>
            <input
              type="number"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={newListing.expiresInDays}
              onChange={(e) =>
                setNewListing({ ...newListing, expiresInDays: Number(e.target.value) })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Buy now / claim</label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={newListing.allowBuyNow ? "yes" : "no"}
              onChange={(e) =>
                setNewListing({ ...newListing, allowBuyNow: e.target.value === "yes" })
              }
            >
              <option value="yes">Enabled</option>
              <option value="no">Disabled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Offers</label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={newListing.allowOffers ? "yes" : "no"}
              onChange={(e) =>
                setNewListing({ ...newListing, allowOffers: e.target.value === "yes" })
              }
            >
              <option value="yes">Enabled</option>
              <option value="no">Disabled</option>
            </select>
          </div>
        </div>

        <button
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
          onClick={createListing}
          disabled={uploadingImage}
        >
          {uploadingImage ? "Uploading image..." : "Publish listing"}
        </button>
      </div>
    </div>
  </section>
)}
        {tab === "manage" && (
          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl bg-white shadow-sm">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-xl font-semibold">My listings</h2>
              </div>

              <div className="space-y-4 p-6">
                {myListings.length ? (
                  myListings.map((item) => {
                    const status = getStatus(item);
                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{item.title}</h3>
                              <span className={`rounded-full px-2 py-1 text-xs ${badgeClass(status)}`}>
                                {status}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {item.price_type === "free" ? "Free" : money(item.price)} · {item.category}
                            </div>
<div className="mt-2 text-sm text-slate-500">
  Expires: {formatDate(item.expires_at)}
  {status === "expired" ? (
    <span className="ml-2 font-medium text-amber-700">Expired</span>
  ) : null}
</div>
                            <div className="mt-1 text-sm text-slate-500">Offers received: {(item.offers || []).length}</div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {status === "expired" ? (
                              <button
                                className="rounded-xl border border-slate-300 px-4 py-2"
                                onClick={() => relist(item.id)}
                              >
                                Relist
                              </button>
                            ) : null}
                            <button
                              className="rounded-xl border border-slate-300 px-4 py-2"
                              onClick={() => setSelectedListing(item)}
                            >
                              View
                            </button>
                            <button
                              className="rounded-xl bg-red-600 px-4 py-2 text-white"
                              onClick={() => deleteListing(item.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                    You have not posted anything yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">How this version works</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-500">
                <div>• Browse current family listings</div>
                <div>• Post an item with title, price or free status, pickup details, and expiration</div>
                <div>• Claim an item immediately or submit an offer</div>
                <div>• Expired items can be relisted with one click</div>
                <div>• Shared listings now come from Supabase</div>
              </div>
            </div>
          </section>
        )}

        {selectedListing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white">
              <div className="grid md:grid-cols-[1.1fr_0.9fr]">
                <div className="bg-slate-100">
                  <img
                    src={selectedListing.photos?.[0]}
                    alt={selectedListing.title}
                    className="h-full max-h-[420px] w-full object-cover md:max-h-[90vh]"
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-2xl font-semibold">{selectedListing.title}</h2>
                    <button
                      onClick={() => setSelectedListing(null)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-sm"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass(getStatus(selectedListing))}`}>
                      {getStatus(selectedListing)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{selectedListing.category}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                      {selectedListing.price_type === "free" ? "Free" : money(selectedListing.price)}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-slate-500">
                    <div>Seller: {selectedListing.seller}</div>
                    <div>
                      Expires: {formatDate(selectedListing.expires_at)} ({getRemainingText(selectedListing.expires_at)})
                    </div>
                    <div>{selectedListing.pickup}</div>
                  </div>

                  <p className="mt-5 text-sm leading-6 text-slate-700">{selectedListing.description}</p>

                  {getStatus(selectedListing) === "active" && selectedListing.seller !== currentUser ? (
                    <div className="mt-6 space-y-5">
                      {selectedListing.allow_buy_now ? (
                        <button
                          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-white"
                          onClick={() => buyNow(selectedListing.id)}
                        >
                          {selectedListing.price_type === "free"
                            ? "Claim item"
                            : `Buy now for ${money(selectedListing.price)}`}
                        </button>
                      ) : null}

                      {selectedListing.allow_offers ? (
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <div className="font-medium">Make an offer</div>
                          <input
                            type="number"
                            value={offerAmount}
                            onChange={(e) => setOfferAmount(e.target.value)}
                            placeholder="Offer amount"
                            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2"
                          />
                          <textarea
                            value={offerNote}
                            onChange={(e) => setOfferNote(e.target.value)}
                            placeholder="Optional note: pickup timing, bundle request, or extra context."
                            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2"
                          />
                          <button
                            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2"
                            onClick={() => submitOffer(selectedListing.id)}
                          >
                            Submit offer
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedListing.claimed_by ? (
                    <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm">
                      This item has been {selectedListing.price_type === "free" ? "claimed" : "purchased"} by{" "}
                      <span className="font-semibold">{selectedListing.claimed_by}</span>.
                    </div>
                  ) : null}

                  {selectedListing.seller === currentUser && selectedListing.offers?.length > 0 ? (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      You have {selectedListing.offers.length} offer{selectedListing.offers.length === 1 ? "" : "s"} on this item.
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <div className="mb-3 font-medium">Offer history</div>
                    <div className="space-y-3">
                      {selectedListing.offers?.length ? (
                        selectedListing.offers.map((offer) => (
                          <div key={offer.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium">{offer.by}</div>
                              <div>{money(offer.amount)}</div>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{new Date(offer.createdAt).toLocaleString()}</div>
                            {offer.note ? <div className="mt-2 text-slate-500">{offer.note}</div> : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                          No offers yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
