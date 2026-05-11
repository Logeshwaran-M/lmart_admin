import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import {
  TrashIcon,
  ClockIcon,
  TagIcon,
  Squares2X2Icon,
  ShoppingBagIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";

/* 🔒 SAFE HELPERS */
const getMainImage = (product) =>
  product.mainImageUrl ||
  product.imageUrls?.find((i) => i.isMain)?.url ||
  "/placeholder.png";

const minPrice = (variants) =>
  Array.isArray(variants)
    ? Math.min(...variants.map((v) => v.offerPrice ?? v.price ?? 0))
    : 0;

const totalStock = (variants) =>
  Array.isArray(variants)
    ? variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
    : 0;

const variantSummary = (variants, key) =>
  Array.isArray(variants)
    ? [...new Set(variants.map((v) => v[key]).filter(Boolean))].join(", ")
    : "—";

const DeletedProductsView = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  /* 🔹 READ ONLY */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "deletedProducts"),
      (snapshot) => {
        setProducts(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }
    );
    return () => unsub();
  }, []);

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrashIcon className="h-6 w-6 text-red-500" />
          Deleted Products (View Only)
        </h1>

        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-lg border border-gray-300"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* HEADER ROW */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold text-gray-500 border-b">
          <div className="col-span-4">PRODUCT</div>
          <div className="col-span-3">DETAILS</div>
          <div className="col-span-2">PRICING (MIN)</div>
          <div className="col-span-2">STOCK (TOTAL)</div>
          <div className="col-span-1">VARIANTS</div>
        </div>

        {/* ROWS */}
        {filtered.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-12 gap-4 px-6 py-5 items-center border-b hover:bg-gray-50"
          >
            {/* PRODUCT */}
            <div className="col-span-4 flex gap-4">
              <img
                src={getMainImage(p)}
                alt={p.name}
                className="w-14 h-14 rounded-lg object-cover border"
              />

              <div>
                <div className="font-semibold text-gray-900">
                  {p.name}
                </div>

                {p.trending && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full">
                    Trending
                  </span>
                )}

                <div className="text-sm text-gray-500 line-clamp-1">
                  {p.description}
                </div>
              </div>
            </div>

            {/* DETAILS */}
            <div className="col-span-3 text-sm text-gray-700 space-y-1">
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-blue-500" />
                {p.sku || "—"}
              </div>
              <div className="flex items-center gap-2">
                <ShoppingBagIcon className="h-4 w-4 text-green-500" />
                {p.brandDisplayName || p.brand}
              </div>
              <div className="flex items-center gap-2">
                <Squares2X2Icon className="h-4 w-4 text-purple-500" />
                {p.categoryDisplayName || "—"}
              </div>
            </div>

            {/* PRICING */}
            <div className="col-span-2 font-semibold text-green-600">
              ₹ {minPrice(p.variants)}
            </div>

            {/* STOCK */}
            <div className="col-span-2">
              <span className="px-4 py-2 text-sm rounded-full bg-yellow-100 text-yellow-700 font-medium">
                {totalStock(p.variants) <= 10
                  ? `Low Stock (${totalStock(p.variants)})`
                  : `In Stock (${totalStock(p.variants)})`}
              </span>
            </div>

            {/* VARIANTS */}
            <div className="col-span-1 text-sm text-gray-600">
              <div>
                Colors: {variantSummary(p.variants, "color")}
              </div>
              <div>
                Sizes: {variantSummary(p.variants, "size")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeletedProductsView;
