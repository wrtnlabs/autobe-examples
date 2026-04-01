import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSellerOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOrderAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallOrderAtSummaryTransformer } from "../transformers/ShoppingMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSellersSellerIdAnalyticsOrders(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerOrderAnalytic> {
  // Query order items for the seller (excluding soft-deleted)
  const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany({
    where: {
      shopping_mall_seller_id: props.sellerId,
      deleted_at: null,
    },
    select: {
      shopping_mall_order_id: true,
      quantity: true,
      price: true,
      status: true,
    },
  });
  // Calculate aggregates
  const total_order_count = new Set(
    orderItems.map((item) => item.shopping_mall_order_id),
  ).size;
  const total_items_sold = orderItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const total_revenue = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  // Status breakdown
  const status_breakdown = {
    paid: orderItems.filter((item) => item.status === "paid").length,
    shipped: orderItems.filter((item) => item.status === "shipped").length,
    delivered: orderItems.filter((item) => item.status === "delivered").length,
    cancelled: orderItems.filter((item) => item.status === "cancelled").length,
    refunded: orderItems.filter((item) => item.status === "refunded").length,
  };
  // Average order value
  const average_order_value =
    total_order_count > 0 ? total_revenue / total_order_count : null;
  // Get recent orders (last 10)
  const distinctOrderIds = Array.from(
    new Set(orderItems.map((item) => item.shopping_mall_order_id)),
  );
  const recentOrders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      id: { in: distinctOrderIds },
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    take: 10,
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  const recent_orders = await ArrayUtil.asyncMap(
    recentOrders,
    ShoppingMallOrderAtSummaryTransformer.transform,
  );
  return {
    total_order_count,
    total_items_sold,
    total_revenue,
    status_breakdown,
    average_order_value,
    recent_orders,
  };
}
