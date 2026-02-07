import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getShoppingMallSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IPageIShoppingMallSnapshot> {
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  // Count total administrators (active and inactive)
  const totalAdmins = await MyGlobal.prisma.shopping_mall_admins.count();
  // Count total sellers by status
  const sellerStats = await MyGlobal.prisma.shopping_mall_sellers.groupBy({
    by: ["approval_status"],
    _count: { id: true },
    where: { deleted_at: null },
  });
  const approvedSellers =
    sellerStats.find((s) => s.approval_status === "approved")?._count.id || 0;
  const rejectedSellers =
    sellerStats.find((s) => s.approval_status === "rejected")?._count.id || 0;
  const suspendedSellers =
    sellerStats.find((s) => s.approval_status === "suspended")?._count.id || 0;
  const pendingSellers =
    sellerStats.find((s) => s.approval_status === "pending")?._count.id || 0;
  // Count total orders by status
  const orderStats = await MyGlobal.prisma.shopping_mall_orders.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const paidOrders =
    orderStats.find((o) => o.status === "paid")?._count.id || 0;
  const shippedOrders =
    orderStats.find((o) => o.status === "shipped")?._count.id || 0;
  const deliveredOrders =
    orderStats.find((o) => o.status === "delivered")?._count.id || 0;
  const cancelledOrders =
    orderStats.find((o) => o.status === "cancelled")?._count.id || 0;
  const refundedOrders =
    orderStats.find((o) => o.status === "refunded")?._count.id || 0;
  const partiallyCompletedOrders =
    orderStats.find((o) => o.status === "partially_completed")?._count.id || 0;
  // Count total products with active variants
  const productsWithActiveVariants =
    await MyGlobal.prisma.shopping_mall_products.count({
      where: {
        variants: {
          some: { deleted_at: null },
        },
      },
    });
  // Count total pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: { status: "pending" },
    });
  // Count total pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: { status: "pending" },
    });
  // Count total system logs from last 24 hours
  const last24Hours = toISOStringSafe(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const recentSystemLogs =
    await MyGlobal.prisma.shopping_mall_system_logs.count({
      where: { created_at: { gte: last24Hours } },
    });
  // Compute total transaction volume
  const totalTransactionVolumeResult =
    await MyGlobal.prisma.shopping_mall_orders.aggregate({
      _sum: { total_amount: true },
    });
  const totalTransactionVolume =
    totalTransactionVolumeResult._sum.total_amount || 0;
  // Compute average order value
  const avgOrderValueResult =
    await MyGlobal.prisma.shopping_mall_orders.aggregate({
      _avg: { total_amount: true },
    });
  const averageOrderValue = avgOrderValueResult._avg.total_amount || 0;
  // Compute seller approval rate
  const totalSellerApplications =
    approvedSellers + rejectedSellers + suspendedSellers + pendingSellers;
  const sellerApprovalRate =
    totalSellerApplications > 0 ? approvedSellers / totalSellerApplications : 0;
  // Compute customer retention rate (repeat orders)
  const customerOrderCounts =
    await MyGlobal.prisma.shopping_mall_customers.findMany({
      select: {
        id: true,
        orders: {
          select: { id: true },
          where: { deleted_at: null },
        },
      },
      where: {
        orders: {
          some: { deleted_at: null },
        },
      },
    });
  const repeatCustomers = customerOrderCounts.filter(
    (customer) => customer.orders.length >= 2,
  ).length;
  const totalCustomers = await MyGlobal.prisma.shopping_mall_customers.count();
  const customerRetentionRate =
    totalCustomers > 0 ? repeatCustomers / totalCustomers : 0;
  // Compute inventory turnover rate
  const totalInventorySold =
    await MyGlobal.prisma.shopping_mall_inventory_histories.count({
      where: {
        reason: "sale",
        quantity_change: { lt: 0 },
      },
    });
  const avgInventoryResult =
    await MyGlobal.prisma.shopping_mall_inventory_histories.aggregate({
      _avg: { quantity_change: true },
    });
  const avgInventory = avgInventoryResult._avg.quantity_change || 0;
  const inventoryTurnoverRate =
    avgInventory !== 0 ? Math.abs(totalInventorySold) / avgInventory : 0;
  // Return aggregated summary with timestamp
  return {
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    },
    data: [
      {
        total_administrators: totalAdmins,
        approved_sellers: approvedSellers,
        rejected_sellers: rejectedSellers,
        suspended_sellers: suspendedSellers,
        pending_sellers: pendingSellers,
        paid_orders: paidOrders,
        shipped_orders: shippedOrders,
        delivered_orders: deliveredOrders,
        cancelled_orders: cancelledOrders,
        refunded_orders: refundedOrders,
        partially_completed_orders: partiallyCompletedOrders,
        products_with_active_variants: productsWithActiveVariants,
        pending_cancellation_requests: pendingCancellations,
        pending_refund_requests: pendingRefunds,
        system_logs_last_24h: recentSystemLogs,
        total_transaction_volume: totalTransactionVolume,
        average_order_value: averageOrderValue,
        seller_approval_rate: sellerApprovalRate,
        customer_retention_rate: customerRetentionRate,
        inventory_turnover_rate: inventoryTurnoverRate,
        computed_at: now,
      },
    ],
  };
}
