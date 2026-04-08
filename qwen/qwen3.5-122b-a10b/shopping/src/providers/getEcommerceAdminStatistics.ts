import { IEcommerceStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdminStatistics(props: {
  admin: AdminPayload;
}): Promise<IEcommerceStatistic> {
  // Count orders by status using groupBy
  const orderStatusCounts = await MyGlobal.prisma.ecommerce_orders.groupBy({
    by: ["status"],
    where: {
      deleted_at: null,
    },
    _count: {
      id: true,
    },
  });
  // Initialize all order status counts to 0
  const orders = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
    partially_completed: 0,
  };
  // Map the groupBy results to the orders object
  for (const item of orderStatusCounts) {
    if (item.status === "paid") orders.paid = item._count.id;
    else if (item.status === "shipped") orders.shipped = item._count.id;
    else if (item.status === "delivered") orders.delivered = item._count.id;
    else if (item.status === "cancelled") orders.cancelled = item._count.id;
    else if (item.status === "refunded") orders.refunded = item._count.id;
    else if (item.status === "partially_completed")
      orders.partially_completed = item._count.id;
  }
  // Count total products (excluding soft-deleted)
  const products = await MyGlobal.prisma.ecommerce_products.count({
    where: {
      deleted_at: null,
    },
  });
  // Count pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_cancellation_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
      },
    });
  // Count pending refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_refund_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
      },
    });
  return {
    orders,
    products,
    pendingCancellationRequests,
    pendingRefundRequests,
  } satisfies IEcommerceStatistic;
}
