import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderAnalytic";
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

export async function patchEcommerceMallAdminOrdersMetrics(props: {
  admin: AdminPayload;
  body: IEcommerceMallOrder.IRequest;
}): Promise<IPageIEcommerceMallOrderAnalytic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const now = new Date();
  const currentDate = now.toISOString().split("T")[0] as string &
    tags.Format<"date">;
  // Build base where clause
  const whereInput: Prisma.ecommerce_mall_ordersWhereInput = {
    deleted_at: null,
    ...(props.body.startDate !== undefined && {
      created_at: { gte: props.body.startDate as string },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: { lte: props.body.endDate as string },
    }),
    ...(props.body.status !== undefined && {
      overall_status: props.body.status,
    }),
  } satisfies Prisma.ecommerce_mall_ordersWhereInput;
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: whereInput,
  });
  // Calculate status counts using single aggregation for efficiency
  const statusAggregation = await MyGlobal.prisma.ecommerce_mall_orders.groupBy(
    {
      by: ["overall_status"],
      where: whereInput,
      _count: { id: true },
    },
  );
  // Extract status counts with defaults
  const statusCounts: {
    paid: number & tags.Type<"int32"> & tags.Minimum<0>;
    shipped: number & tags.Type<"int32"> & tags.Minimum<0>;
    delivered: number & tags.Type<"int32"> & tags.Minimum<0>;
    cancelled: number & tags.Type<"int32"> & tags.Minimum<0>;
    refunded: number & tags.Type<"int32"> & tags.Minimum<0>;
    partiallyCompleted: number & tags.Type<"int32"> & tags.Minimum<0>;
  } = {
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
    partiallyCompleted: 0,
  };
  for (const item of statusAggregation) {
    if (item.overall_status === "paid") {
      statusCounts.paid = item._count.id;
    } else if (item.overall_status === "shipped") {
      statusCounts.shipped = item._count.id;
    } else if (item.overall_status === "delivered") {
      statusCounts.delivered = item._count.id;
    } else if (item.overall_status === "cancelled") {
      statusCounts.cancelled = item._count.id;
    } else if (item.overall_status === "refunded") {
      statusCounts.refunded = item._count.id;
    } else if (item.overall_status === "partiallyCompleted") {
      statusCounts.partiallyCompleted = item._count.id;
    }
  }
  // Calculate average order value for shipped/delivered orders
  const completedOrdersResult =
    await MyGlobal.prisma.ecommerce_mall_orders.aggregate({
      where: {
        ...whereInput,
        overall_status: {
          in: ["shipped", "delivered"],
        },
      },
      _avg: { total_price: true },
    });
  const averageOrderValue =
    completedOrdersResult._avg.total_price !== null
      ? Number(completedOrdersResult._avg.total_price.toFixed(2))
      : 0;
  // Calculate fulfilled orders
  const fulfilledOrders = statusCounts.shipped + statusCounts.delivered;
  // Calculate cancelled orders
  const cancelledOrders = statusCounts.cancelled;
  // Calculate refunded orders
  const refundedOrders = statusCounts.refunded;
  // Generate analytics record ID
  const analyticsId = v4() as string & tags.Format<"uuid">;
  // Build period dates from filter or use current date
  const periodStart =
    props.body.startDate !== undefined
      ? (props.body.startDate.split("T")[0] as string & tags.Format<"date">)
      : currentDate;
  const periodEnd =
    props.body.endDate !== undefined
      ? (props.body.endDate.split("T")[0] as string & tags.Format<"date">)
      : currentDate;
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: [
      {
        id: analyticsId,
        periodStart: periodStart,
        periodEnd: periodEnd,
        totalOrders: total,
        statusCounts: statusCounts,
        fulfilledOrders: fulfilledOrders,
        cancelledOrders: cancelledOrders,
        refundedOrders: refundedOrders,
        averageOrderValue: averageOrderValue,
      },
    ],
  } satisfies IPageIEcommerceMallOrderAnalytic.ISummary;
}
