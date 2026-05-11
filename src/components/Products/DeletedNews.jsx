import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  FiTrash2,
  FiSearch,
  FiCalendar,
  FiX,
  FiAlertTriangle,
  FiEye,
  FiImage,
  FiVideo,
  FiTag
} from "react-icons/fi";

/* ---------------- HELPERS ---------------- */

const formatDate = (ts) =>
  ts?.toDate
    ? ts.toDate().toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown Date";

/* ---------------- HISTORY MODAL ---------------- */

const HistoryModal = ({ open, onClose, item }) => {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative">

        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FiAlertTriangle className="text-orange-500" />
            Item History
          </h2>
          <button onClick={onClose}>
            <FiX className="text-xl text-gray-500 hover:text-black" />
          </button>
        </div>

        {/* ITEM INFO */}
        <div className="p-6 border-b">
          <div className="flex gap-4 items-center">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center">
                <FiImage />
              </div>
            )}

            <div>
              <h3 className="text-xl font-bold">{item.title}</h3>
              <p className="text-gray-600">
                Category: <span className="font-medium">{item.category}</span>
              </p>
            </div>
          </div>
        </div>

        {/* DELETION AUDIT */}
        <div className="p-6 bg-red-50 border-b">
          <h4 className="font-bold text-red-600 flex items-center gap-2 mb-4">
            <FiAlertTriangle />
            DELETION AUDIT
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">DATE DELETED</p>
              <p className="font-semibold">
                {formatDate(item.deletedAt)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">DELETED BY</p>
              <p className="font-semibold">
                {item.deletedBy || "admin"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-gray-500 mb-1">REASON FOR REMOVAL</p>
            <div className="border rounded-lg p-3 bg-white italic">
              {item.deleteReason || "Manual deletion"}
            </div>
          </div>
        </div>

        {/* ARTICLE DETAILS */}
        <div className="p-6">
          <h4 className="font-bold mb-4 flex items-center gap-2">
            <FiTag />
            ARTICLE DETAILS
          </h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">ORIGINAL ID</p>
              <p className="font-mono">{item.id}</p>
            </div>
            <div>
              <p className="text-gray-500">MEDIA TYPE</p>
              <p className="font-semibold">
                {item.imageUrl && item.videoUrl
                  ? "Image + Video"
                  : item.imageUrl
                  ? "Image"
                  : item.videoUrl
                  ? "Video"
                  : "No Media"}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ---------------- MAIN PAGE ---------------- */

const DeletedNews = () => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "deletedNews"),
      orderBy("deletedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase();
    return data.filter(d =>
      d.title?.toLowerCase().includes(t) ||
      d.category?.toLowerCase().includes(t)
    );
  }, [data, search]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FiTrash2 className="text-red-600" />
          Deleted News Archive
        </h1>

        <div className="flex items-center gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-10 pr-4 py-2 border rounded-lg"
              placeholder="Search title or category"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <span className="px-4 py-2 bg-orange-500 text-white rounded-lg font-bold">
            Total: {filtered.length}
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="p-4">NEWS INFO</th>
              <th className="p-4">CATEGORY</th>
              <th className="p-4">DELETION DETAILS</th>
              <th className="p-4 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-t">
                <td className="p-4">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-gray-500">
                    ID: {item.id.slice(0, 8)}...
                  </p>
                </td>

                <td className="p-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {item.category}
                  </span>
                </td>

                <td className="p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FiCalendar />
                    {formatDate(item.deletedAt)}
                  </div>
                  <span className="text-red-600 italic">
                    "Manual deletion"
                  </span>
                </td>

                <td className="p-4 text-right">
                  <button
                    onClick={() => setSelected(item)}
                    className="text-orange-600 hover:underline flex items-center gap-1 ml-auto"
                  >
                    <FiEye />
                    View Full History
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan="4" className="p-10 text-center text-gray-500">
                  No deleted news found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      <HistoryModal
        open={!!selected}
        item={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};

export default DeletedNews;
