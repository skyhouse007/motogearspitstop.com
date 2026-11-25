//frontend/src/pages/admin/AdminOrders.jsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import api from '@/api/axiosInstance';
import { FIRST_PURCHASE_PROMO } from '@/config/promotions';
import { COD_ADVANCE_PERCENTAGE } from '@/utils/orderPricing';
import { handleProductImageError } from '@/utils/imageUtils';
import { formatUserPhone } from '@/utils/userDisplay';
import { productUrl } from '@/utils/urlUtils';

const getOrderItemProductPath = (item) => {
  const rawId =
    item.externalProductId ||
    (item.product && typeof item.product === 'object' ? item.product._id : item.product);
  if (rawId == null || String(rawId).trim() === '') return null;
  return productUrl({ id: String(rawId) });
};

function OrderItemProductLink({ item, className = '', children }) {
  const path = getOrderItemProductPath(item);
  if (!path) {
    return <div className={className}>{children}</div>;
  }
  return (
    <Link
      to={path}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} transition-colors hover:[&_p]:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}

const STATUS_COLORS = {
  processing: 'bg-yellow-900 text-yellow-300',
  confirmed: 'bg-blue-900 text-blue-300',
  shipped: 'bg-purple-900 text-purple-300',
  delivered: 'bg-green-900 text-green-300',
  cancelled: 'bg-red-900 text-red-300',
};

const formatINR = (value = 0) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

/** Razorpay charge when saved on the order; else legacy amountPaid. */
const getStoredPaidAmount = (order) => {
  const collected = Number(order?.paymentInfo?.collectedAmount);
  if (Number.isFinite(collected) && collected > 0) return collected;
  return Number(order?.amountPaid || 0);
};

/** COD paid / due for admin — aligns leftover with checkout % advance when legacy data is wrong. */
const getCodPaymentSummary = (order) => {
  const total = Number(order.totalPrice || 0);
  const storedPaid = getStoredPaidAmount(order);
  const verifiedCollected = Number(order?.paymentInfo?.collectedAmount);
  const hasVerifiedCollected = Number.isFinite(verifiedCollected) && verifiedCollected > 0;

  if (order.paymentMethod !== 'cod') {
    return {
      paidOnline: storedPaid,
      dueOnDelivery: Math.max(Number(order.amountDue || 0), 0),
      checkoutAdvance: null,
      paymentCorrected: false,
      storedPaid,
    };
  }

  // Checkout always charges this % (ignore wrong legacy codAdvancePercentage e.g. 20% → Rs. 440).
  const checkoutAdvance =
    total > 0 ? Math.max(Math.round(total * (COD_ADVANCE_PERCENTAGE / 100)), 1) : 0;

  let paidOnline = storedPaid;
  let paymentCorrected = false;

  if (hasVerifiedCollected) {
    paidOnline = verifiedCollected;
  } else if (checkoutAdvance > 0) {
    paidOnline = checkoutAdvance;
    paymentCorrected = storedPaid !== checkoutAdvance;
  }

  const dueOnDelivery = Math.max(total - paidOnline, 0);

  return {
    paidOnline,
    dueOnDelivery,
    checkoutAdvance,
    paymentCorrected,
    storedPaid,
  };
};

const paymentMethodLabel = (method) => {
  if (method === 'razorpay') return 'Pay full online';
  if (method === 'cod') return 'Cash on delivery';
  return method || '—';
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/orders?page=${page}&limit=15${statusFilter ? `&status=${statusFilter}` : ''}`);
      setOrders(res.data.orders);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    try {
      await api.put(`/admin/orders/${orderId}`, { orderStatus: status });
      setOrders(orders.map((o) => (o._id === orderId ? { ...o, orderStatus: status } : o)));
    } catch (err) {
      console.error(err);
    }
    setUpdating(null);
  };

  const toggleExpand = (orderId) => {
    setExpandedId((current) => (current === orderId ? null : orderId));
  };

  return (
    <div className="p-6 min-h-screen bg-gray-950">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-bold">Orders ({total})</h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="processing">Processing</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-12 text-center text-gray-500">
            Loading…
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-12 text-center text-gray-500">
            No orders found
          </div>
        ) : (
          orders.map((order) => {
            const expanded = expandedId === order._id;
            const addr = order.shippingAddress || {};
            const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            const { paidOnline, dueOnDelivery } = getCodPaymentSummary(order);
            const itemsSubtotal =
              order.itemsPrice ??
              (order.items || []).reduce(
                (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
                0,
              );

            return (
              <div
                key={order._id}
                className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(order._id)}
                  className="flex w-full flex-wrap items-start gap-4 border-b border-gray-800 px-4 py-4 text-left transition-colors hover:bg-gray-800/40"
                >
                  <span className="mt-0.5 text-gray-400">
                    {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                  <div className="min-w-0 flex-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Order ID</p>
                      <p className="break-all font-mono text-xs text-gray-300">{order._id}</p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        {new Date(order.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Customer &amp; address</p>
                      <p className="text-sm font-medium text-white">{addr.fullName || order.user?.name || '—'}</p>
                      <p className="text-xs text-gray-400">
                        {formatUserPhone(addr.phone || order.user?.phone) || '—'}
                      </p>
                      {addr.email ? (
                        <p className="mt-1 text-xs text-gray-400 break-all">{addr.email}</p>
                      ) : null}
                      {(addr.addressLine1 || addr.city || addr.pincode) ? (
                        <address className="mt-2 space-y-0.5 text-xs not-italic leading-snug text-gray-300">
                          {addr.addressLine1 ? <span className="block">{addr.addressLine1}</span> : null}
                          {addr.addressLine2 ? <span className="block">{addr.addressLine2}</span> : null}
                          {(addr.city || addr.state || addr.pincode) && (
                            <span className="block text-gray-400">
                              {[addr.city, addr.state].filter(Boolean).join(', ')}
                              {addr.pincode ? ` — ${addr.pincode}` : ''}
                            </span>
                          )}
                        </address>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">No shipping address saved</p>
                      )}
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">
                        Items ({itemCount})
                      </p>
                      <ul className="mt-2 flex flex-col gap-2">
                        {(order.items || []).length === 0 ? (
                          <li className="text-xs text-gray-500">—</li>
                        ) : (
                          (order.items || []).map((item, index) => (
                            <li
                              key={item._id || `${order._id}-thumb-${index}`}
                              className="min-w-0 rounded-lg border border-gray-800 bg-gray-950/60"
                            >
                              <OrderItemProductLink
                                item={item}
                                className="flex min-w-0 items-center gap-3 p-2 pr-3"
                              >
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name || 'Product'}
                                    onError={(event) => handleProductImageError(event, { image: item.image })}
                                    className="h-16 w-16 shrink-0 rounded-lg border border-gray-700 object-cover"
                                  />
                                ) : (
                                  <div
                                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-[11px] text-gray-500"
                                    aria-hidden
                                  >
                                    N/A
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="line-clamp-2 text-sm font-medium leading-snug text-gray-200">
                                    {item.name || 'Product'}
                                  </p>
                                  <p className="mt-0.5 text-xs text-gray-500">
                                    Qty {item.quantity} · {formatINR(item.price)}
                                  </p>
                                </div>
                              </OrderItemProductLink>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                    <div className="lg:col-span-2">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Total / Paid</p>
                      <p className="text-sm font-bold text-white">{formatINR(order.totalPrice)}</p>
                      <p className="text-xs font-semibold text-green-400">
                        Paid online {formatINR(paidOnline)}
                        {dueOnDelivery > 0 && (
                          <span className="font-normal text-orange-400">
                            {' '}
                            · Due on delivery {formatINR(dueOnDelivery)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="lg:col-span-1">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500">Status</p>
                      <span className={`inline-block text-xs px-2 py-1 rounded-full ${STATUS_COLORS[order.orderStatus]}`}>
                        {order.orderStatus}
                      </span>
                      <p className="mt-1 text-[11px] uppercase text-gray-500">{order.paymentStatus}</p>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-6 px-4 py-5">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <DetailSection title="Products">
                        <div className="overflow-x-auto rounded-lg border border-gray-800">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-800 bg-gray-950/80">
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Product</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">Price</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">Qty</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">Line total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(order.items || []).length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                                    No line items
                                  </td>
                                </tr>
                              ) : (
                                (order.items || []).map((item, index) => {
                                  const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                                  return (
                                    <tr key={item._id || `${order._id}-${index}`} className="border-b border-gray-800/80">
                                      <td className="px-3 py-3">
                                        <OrderItemProductLink item={item} className="flex gap-3">
                                          {item.image ? (
                                            <img
                                              src={item.image}
                                              alt=""
                                              className="h-12 w-12 shrink-0 rounded-md border border-gray-700 object-cover"
                                            />
                                          ) : null}
                                          <div className="min-w-0">
                                            <p className="line-clamp-2 font-medium text-white hover:underline">
                                              {item.name || item.externalProductId || 'Product'}
                                            </p>
                                            {item.externalProductId ? (
                                              <p className="text-[11px] text-gray-500">
                                                SKU {item.externalProductId}
                                              </p>
                                            ) : null}
                                          </div>
                                        </OrderItemProductLink>
                                      </td>
                                      <td className="px-3 py-3 text-right text-gray-300">{formatINR(item.price)}</td>
                                      <td className="px-3 py-3 text-right text-gray-300">{item.quantity}</td>
                                      <td className="px-3 py-3 text-right font-semibold text-white">{formatINR(lineTotal)}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </DetailSection>

                      <DetailSection title="Order summary (like cart)">
                        <dl className="space-y-2 text-sm">
                          <SummaryRow label={`Items (${itemCount})`} value={formatINR(itemsSubtotal)} />
                          <SummaryRow label="Delivery charge" value={formatINR(order.shippingPrice)} />
                          {Number(order.firstPurchaseDiscount) > 0 && (
                            <SummaryRow
                              label={`First purchase (${FIRST_PURCHASE_PROMO.discountPercent}%)`}
                              value={`-${formatINR(order.firstPurchaseDiscount)}`}
                              valueClass="text-green-400"
                            />
                          )}
                          {Number(order.onlinePaymentDiscount) > 0 && (
                            <SummaryRow
                              label="Online payment offer"
                              value={`-${formatINR(order.onlinePaymentDiscount)}`}
                              valueClass="text-green-400"
                            />
                          )}
                          <SummaryRow
                            label="Total"
                            value={formatINR(order.totalPrice)}
                            bold
                            divider
                          />
                          <SummaryRow
                            label="Paid online (Razorpay)"
                            value={formatINR(paidOnline)}
                            valueClass="text-green-400"
                          />
                          <SummaryRow
                            label="Leftover on delivery"
                            value={formatINR(dueOnDelivery)}
                            valueClass="text-orange-400"
                          />
                          {order.paymentMethod === 'cod' && (
                            <SummaryRow
                              label="COD advance %"
                              value={`${COD_ADVANCE_PERCENTAGE}%`}
                            />
                          )}
                        </dl>
                      </DetailSection>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <DetailSection title="Shipping address">
                        <p className="text-sm leading-relaxed text-gray-300">
                          {addr.fullName && <span className="block font-medium text-white">{addr.fullName}</span>}
                          {addr.addressLine1}
                          {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                          <br />
                          {addr.city}, {addr.state} — {addr.pincode}
                          <br />
                          {addr.phone && <>Phone: {addr.phone}<br /></>}
                          {addr.email && <>Email: {addr.email}</>}
                        </p>
                      </DetailSection>

                      <DetailSection title="Payment">
                        <dl className="space-y-2 text-sm">
                          <SummaryRow label="Method" value={paymentMethodLabel(order.paymentMethod)} />
                          <SummaryRow label="Payment status" value={order.paymentStatus} />
                          {order.paidAt && (
                            <SummaryRow
                              label="Paid at"
                              value={new Date(order.paidAt).toLocaleString('en-IN')}
                            />
                          )}
                          {order.paymentInfo?.razorpay_payment_id && (
                            <SummaryRow
                              label="Razorpay payment ID"
                              value={order.paymentInfo.razorpay_payment_id}
                              mono
                            />
                          )}
                          {order.paymentInfo?.razorpay_order_id && (
                            <SummaryRow
                              label="Razorpay order ID"
                              value={order.paymentInfo.razorpay_order_id}
                              mono
                            />
                          )}
                        </dl>
                      </DetailSection>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-gray-800 pt-4">
                      <label className="text-sm text-gray-400">Update status</label>
                      <select
                        value={order.orderStatus}
                        disabled={updating === order._id}
                        onChange={(e) => updateStatus(order._id, e.target.value)}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                      >
                        <option value="processing">Processing</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!loading && orders.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
          <p className="text-gray-400 text-sm">
            Page {page} of {Math.max(1, Math.ceil(total / 15))}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded bg-gray-800 px-3 py-1 text-sm text-white disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= Math.ceil(total / 15)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded bg-gray-800 px-3 py-1 text-sm text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">{title}</h3>
      {children}
    </section>
  );
}

function SummaryRow({ label, value, valueClass = 'text-white', bold = false, divider = false, mono = false }) {
  return (
    <div
      className={`flex justify-between gap-4 ${divider ? 'border-t border-gray-800 pt-2 mt-2' : ''} ${bold ? 'font-bold' : ''}`}
    >
      <dt className="text-gray-400">{label}</dt>
      <dd className={`text-right ${valueClass} ${mono ? 'break-all font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}