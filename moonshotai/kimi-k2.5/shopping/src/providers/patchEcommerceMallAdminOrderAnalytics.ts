import { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
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

export async function patchEcommerceMallAdminOrderAnalytics(props: {
  admin: AdminPayload;
  body: IEcommerceMallOrderAnalytic.IRequest;
}): Promise<IEcommerceMallOrderAnalytic> {
  const { startDate, endDate, status } = props.body;
  // Validate date range if both provided
  if (
    startDate !== undefined &&
    startDate !== null &&
    endDate !== undefined &&
    endDate !== null
  ) {
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    if (startTime > endTime) {
      throw new HttpException(
        "endDate must be greater than or equal to startDate",
        400,
      );
    }
  }
  // Build date filter conditions
  const dateFilter: Prisma.DateTimeFilter = {};
  if (startDate !== undefined && startDate !== null) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate !== undefined && endDate !== null) {
    dateFilter.lte = new Date(endDate);
  }
  const baseWhere: Prisma.ecommerce_mall_order_itemsWhereInput =
    Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {};
  // Add status filter if provided
  if (status !== undefined && status !== null) {
    baseWhere.status = status;
  }
  // Query total items count
  const totalItems = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: baseWhere,
  });
  // Query total revenue (only for non-cancelled and non-refunded items)
  const revenueItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: {
        ...baseWhere,
        status: { notIn: ["cancelled", "refunded"] },
      },
      select: {
        price_at_purchase: true,
        quantity: true,
      },
    });
  const totalRevenue = revenueItems.reduce(
    (
      sum: number,
      item: {
        price_at_purchase: number;
        quantity: number;
      },
    ) => sum + item.price_at_purchase * item.quantity,
    0,
  );
  // Query status counts using groupBy
  const statusGroups = await MyGlobal.prisma.ecommerce_mall_order_items.groupBy(
    {
      by: ["status"],
      where: baseWhere,
      _count: {
        status: true,
      },
    },
  );
  const statusCounts: {
    paid: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  } = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };
  for (const group of statusGroups) {
    const statusValue = group.status as
      | "paid"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "refunded";
    statusCounts[statusValue] = group._count.status;
  }
  // Query pending cancellation requests
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: baseWhere,
      },
    });
  // Query pending refund requests
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: baseWhere,
      },
    });
  return {
    totalItems,
    totalRevenue,
    statusCounts,
    pendingCancellationRequests,
    pendingRefundRequests,
  };
}
