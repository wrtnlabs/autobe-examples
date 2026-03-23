import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerMonthlyOrderTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerMonthlyOrderTrend";
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

export async function getShoppingMallAdminSellersSellerIdMetrics(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller.IMetric> {
  // Verify seller exists
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  // Query order items for stats and revenue calculation
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_seller_id: props.sellerId,
      deleted_at: null,
    },
    select: {
      status: true,
      quantity: true,
      price: true,
      created_at: true,
    },
  });
  // Calculate order items stats by status
  const order_items_stats = {
    paid: orderItems.filter((item) => item.status === "paid").length as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    shipped: orderItems.filter((item) => item.status === "shipped")
      .length as number & tags.Type<"int32"> & tags.Minimum<0>,
    delivered: orderItems.filter((item) => item.status === "delivered")
      .length as number & tags.Type<"int32"> & tags.Minimum<0>,
    cancelled: orderItems.filter((item) => item.status === "cancelled")
      .length as number & tags.Type<"int32"> & tags.Minimum<0>,
    refunded: orderItems.filter((item) => item.status === "refunded")
      .length as number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  // Calculate total revenue (sum of quantity * price for each item)
  const total_revenue = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  ) as number & tags.Minimum<0>;
  // Query shipment stats
  const shipments = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: {
      seller_id: props.sellerId,
      deleted_at: null,
    },
    select: {
      delivery_confirmed: true,
    },
  });
  const total_shipments = shipments.length as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const confirmed_deliveries = shipments.filter(
    (s) => s.delivery_confirmed,
  ).length;
  const delivery_confirmation_rate =
    total_shipments > 0
      ? ((confirmed_deliveries / total_shipments) as number &
          tags.Minimum<0> &
          tags.Maximum<1>)
      : (0 as number & tags.Minimum<0> & tags.Maximum<1>);
  const shipment_stats = {
    total_shipments,
    delivery_confirmation_rate,
  };
  // Query cancellation request stats
  const cancellationRequests =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: {
        deleted_at: null,
        orderItem: {
          shopping_mall_seller_id: props.sellerId,
          deleted_at: null,
        },
      },
      select: {
        status: true,
      },
    });
  const cancellation_request_stats = {
    pending: cancellationRequests.filter((r) => r.status === "pending")
      .length as number & tags.Type<"int32"> & tags.Minimum<0>,
    approved: cancellationRequests.filter((r) => r.status === "approved")
      .length as number & tags.Type<"int32"> & tags.Minimum<0>,
    rejected: cancellationRequests.filter((r) => r.status === "rejected")
      .length as number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  // Query refund request stats
  const refundRequests =
    await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where: {
        deleted_at: null,
        orderItem: {
          shopping_mall_seller_id: props.sellerId,
          deleted_at: null,
        },
      },
      select: {
        status: true,
      },
    });
  const refund_request_stats = {
    pending: refundRequests.filter((r) => r.status === "pending")
      .length as number & tags.Type<"int32"> & tags.Minimum<0>,
    approved: refundRequests.filter((r) => r.status === "approved")
      .length as number & tags.Type<"int32"> & tags.Minimum<0>,
    rejected: refundRequests.filter((r) => r.status === "rejected")
      .length as number & tags.Type<"int32"> & tags.Minimum<0>,
  };
  // Query reviews for average rating and total count
  const reviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: {
      deleted_at: null,
      orderItem: {
        shopping_mall_seller_id: props.sellerId,
        deleted_at: null,
      },
    },
    select: {
      rating: true,
    },
  });
  const total_reviews = reviews.length as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const average_rating =
    reviews.length > 0
      ? ((reviews.reduce((sum, r) => sum + r.rating, 0) /
          reviews.length) as number & tags.Minimum<1> & tags.Maximum<5>)
      : null;
  // Query monthly order trends (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const monthlyTrends =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_seller_id: props.sellerId,
        deleted_at: null,
        created_at: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        created_at: true,
        quantity: true,
        price: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });
  // Group by month and calculate stats
  const monthlyMap = new Map<
    string,
    {
      count: number;
      revenue: number;
    }
  >();
  for (const item of monthlyTrends) {
    const monthDate = item.created_at;
    const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyMap.get(month) ?? { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += item.quantity * item.price;
    monthlyMap.set(month, existing);
  }
  const monthly_order_trends: IShoppingMallSellerMonthlyOrderTrend[] =
    Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: month as string & tags.Pattern<"^[0-9]{4}-[0-9]{2}$">,
        orderItemCount: data.count as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        revenue: data.revenue as number & tags.Minimum<0>,
      }))
      .slice(-12);
  // Calculate derived metrics
  const delivered_count = order_items_stats.delivered as unknown as number;
  const cancellation_rate =
    delivered_count > 0
      ? (((cancellation_request_stats.approved as unknown as number) /
          delivered_count) as number & tags.Minimum<0> & tags.Maximum<1>)
      : (0 as number & tags.Minimum<0> & tags.Maximum<1>);
  const refund_rate =
    delivered_count > 0
      ? (((refund_request_stats.approved as unknown as number) /
          delivered_count) as number & tags.Minimum<0> & tags.Maximum<1>)
      : (0 as number & tags.Minimum<0> & tags.Maximum<1>);
  return {
    order_items_stats,
    total_revenue,
    shipment_stats,
    cancellation_request_stats,
    refund_request_stats,
    average_rating,
    total_reviews,
    monthly_order_trends,
    cancellation_rate,
    refund_rate,
    delivery_confirmation_rate,
  };
}
