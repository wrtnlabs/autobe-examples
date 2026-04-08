import { IEcommerceAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerAnalytics(props: {
  seller: SellerPayload;
}): Promise<IEcommerceAnalytic> {
  // Count active products (deleted_at IS NULL)
  const products = await MyGlobal.prisma.ecommerce_products.count({
    where: { deleted_at: null },
  });
  // Count total active orders
  const ordersTotal = await MyGlobal.prisma.ecommerce_orders.count({
    where: { deleted_at: null },
  });
  // Group orders by status
  const ordersByStatus = await MyGlobal.prisma.ecommerce_orders.groupBy({
    by: ["status"],
    where: { deleted_at: null },
    _count: { status: true },
  });
  // Build order status breakdown
  const byStatus = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
    partially_completed: 0,
  };
  for (const order of ordersByStatus) {
    if (order.status === "paid") byStatus.paid = order._count.status;
    else if (order.status === "shipped") byStatus.shipped = order._count.status;
    else if (order.status === "delivered")
      byStatus.delivered = order._count.status;
    else if (order.status === "cancelled")
      byStatus.cancelled = order._count.status;
    else if (order.status === "refunded")
      byStatus.refunded = order._count.status;
    else if (order.status === "partially_completed")
      byStatus.partially_completed = order._count.status;
  }
  // Count active customers (deleted_at IS NULL)
  const customers = await MyGlobal.prisma.ecommerce_customers.count({
    where: { deleted_at: null },
  });
  // Count total active sellers
  const sellersTotal = await MyGlobal.prisma.ecommerce_sellers.count({
    where: { deleted_at: null },
  });
  // Group sellers by approval status
  const sellersByApproval = await MyGlobal.prisma.ecommerce_sellers.groupBy({
    by: ["approval_status"],
    where: { deleted_at: null },
    _count: { approval_status: true },
  });
  // Build approval status breakdown
  const byApprovalStatus = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const seller of sellersByApproval) {
    if (seller.approval_status === "pending")
      byApprovalStatus.pending = seller._count.approval_status;
    else if (seller.approval_status === "approved")
      byApprovalStatus.approved = seller._count.approval_status;
    else if (seller.approval_status === "rejected")
      byApprovalStatus.rejected = seller._count.approval_status;
  }
  // Group sellers by suspension status
  const sellersBySuspension = await MyGlobal.prisma.ecommerce_sellers.groupBy({
    by: ["is_suspended", "is_banned"],
    where: { deleted_at: null },
    _count: { is_suspended: true },
  });
  // Build suspension breakdown
  const bySuspension = {
    active: 0,
    suspended: 0,
    banned: 0,
  };
  for (const seller of sellersBySuspension) {
    if (seller.is_suspended === false && seller.is_banned === false)
      bySuspension.active = seller._count.is_suspended;
    else if (seller.is_suspended === true)
      bySuspension.suspended = seller._count.is_suspended;
    else if (seller.is_banned === true)
      bySuspension.banned = seller._count.is_suspended;
  }
  // Count pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_cancellation_requests.count({
      where: { status: "pending", deleted_at: null },
    });
  // Count pending refund requests
  const pendingRefunds = await MyGlobal.prisma.ecommerce_refund_requests.count({
    where: { status: "pending", deleted_at: null },
  });
  // Generate timestamp
  const generatedAt = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date()),
  );
  return {
    products,
    orders: {
      total: ordersTotal,
      by_status: byStatus,
    },
    customers,
    sellers: {
      total: sellersTotal,
      by_approval_status: byApprovalStatus,
      by_suspension: bySuspension,
    },
    pending_cancellation_requests: pendingCancellations,
    pending_refund_requests: pendingRefunds,
    generated_at: generatedAt,
  };
}
