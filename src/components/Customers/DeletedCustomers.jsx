import React, { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";
import { Users, Trash2, Calendar } from "lucide-react";

const DeletedCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "deletedCustomers"),
      orderBy("deletedAt", "desc")
    );

    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setCustomers(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return <p className="p-6">Loading deleted customers...</p>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Trash2 /> Deleted Customers
      </h1>

      {customers.length === 0 ? (
        <p className="text-gray-500">No deleted customers</p>
      ) : (
        <div className="bg-white rounded-xl shadow">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Email</th>
                 <th className="p-4 text-left">Contact No</th>
                <th className="p-4 text-left">Deleted At</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="p-4">{c.name}</td>
                  <td className="p-4">{c.email}</td>
                    <td className="p-4 text-gray-700">
        {c.contactNo || "—"}
      </td>
                  <td className="p-4 flex items-center gap-2">
                    <Calendar size={14} />
                    {c.deletedAt?.toDate?.().toLocaleString() || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeletedCustomers;
