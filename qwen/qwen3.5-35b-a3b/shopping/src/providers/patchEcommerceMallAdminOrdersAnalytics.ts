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

export async function patchEcommerceMallAdminOrdersAnalytics(props: {
  admin: AdminPayload;
  body: IEcommerceMallOrderAnalytic.IRequest;
}): Promise<IEcommerceMallOrderAnalytic.ISummary> {
  // Validate and normalize pagination parameters
  const page = props.body.page ?? 1;
  const pageSize = props.body.limit ?? props.body.pageSize ?? 20;
  // Calculate pagination bounds
  const validatedPage = Math.max(1, page) as number & tags.Type<"int32">;
  const validatedLimit =
    props.body.limit === null || props.body.limit === undefined
      ? Math.min(100, Math.max(1, pageSize))
      : Math.min(100, Math.max(1, props.body.limit));
  // Build dynamic where filter using satisfies for type safety
  const whereFilter: Prisma.ecommerce_mall_ordersWhereInput = {};
  // Apply date range filters - build directly in whereFilter
  if (props.body.fromDate !== undefined || props.body.toDate !== undefined) {
    whereFilter.created_at = {};
    if (props.body.fromDate !== undefined) {
      whereFilter.created_at.gte = props.body.fromDate;
    }
    if (props.body.toDate !== undefined) {
      whereFilter.created_at.lte = props.body.toDate;
    }
  }
  // Apply status filter
  if (props.body.status !== undefined) {
    whereFilter.overall_status = props.body.status;
  }
  // Query aggregated metrics by status using Promise.all for parallel execution
  const [
    paidResult,
    shippedResult,
    deliveredResult,
    cancelledResult,
    refundedResult,
    totalResult,
  ] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_orders.count({
      where: { ...whereFilter, overall_status: "paid" },
    }),
    MyGlobal.prisma.ecommerce_mall_orders.count({
      where: { ...whereFilter, overall_status: "shipped" },
    }),
    MyGlobal.prisma.ecommerce_mall_orders.count({
      where: { ...whereFilter, overall_status: "delivered" },
    }),
    MyGlobal.prisma.ecommerce_mall_orders.count({
      where: { ...whereFilter, overall_status: "cancelled" },
    }),
    MyGlobal.prisma.ecommerce_mall_orders.count({
      where: { ...whereFilter, overall_status: "refunded" },
    }),
    MyGlobal.prisma.ecommerce_mall_orders.count({ where: whereFilter }),
  ]);
  // Calculate pagination metadata
  const totalItems = totalResult;
  const totalPages =
    validatedLimit > 0 ? Math.ceil(totalItems / validatedLimit) : 0;
  // Build and return response with explicit type satisfaction
  return {
    pagination: {
      page: validatedPage,
      pageSize: validatedLimit,
      totalItems: totalItems,
      totalPages: totalPages,
    } satisfies IEcommerceMallOrderAnalytic.ISummary["pagination"],
    data: {
      ordersCreated: paidResult,
      ordersShipped: shippedResult,
      ordersDelivered: deliveredResult,
      ordersCancelled: cancelledResult,
      ordersRefunded: refundedResult,
      totalOrders: totalItems,
    } satisfies IEcommerceMallOrderAnalytic.ISummary["data"],
  };
}
