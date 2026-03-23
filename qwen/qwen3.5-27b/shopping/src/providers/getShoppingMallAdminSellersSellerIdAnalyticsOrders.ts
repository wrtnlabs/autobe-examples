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
  // Calculate aggregates using Prisma's aggregate features
  const aggregates = await MyGlobal.prisma.shopping_mall_order_items.aggregate({
    where: {
      shopping_mall_seller_id: props.sellerId,
      deleted_at: null,
    },
    _count: {
      shopping_mall_order_id: true,
    },
    _sum: {
      quantity: true,
      price: true,
    },
  });
  // Get distinct order count
  const distinctOrders =
    await MyGlobal.prisma.shopping_mall_order_items.groupBy({
      by: ["shopping_mall_order_id"],
      where: {
        shopping_mall_seller_id: props.sellerId,
        deleted_at: null,
      },
      _count: {
        shopping_mall_order_id: true,
      },
    });
  const totalOrderCount = distinctOrders.length;
  const totalItemsSold = aggregates._sum?.quantity ?? 0;
  const totalRevenue =
    aggregates._sum?.quantity && aggregates._sum?.price
      ? aggregates._sum.quantity * aggregates._sum.price
      : 0;
  // Calculate status breakdown using groupBy
  const statusGroups = await MyGlobal.prisma.shopping_mall_order_items.groupBy({
    by: ["status"],
    where: {
      shopping_mall_seller_id: props.sellerId,
      deleted_at: null,
    },
    _count: true,
  });
  const statusBreakdown = {
    paid: statusGroups.find((g) => g.status === "paid")?._count ?? 0,
    shipped: statusGroups.find((g) => g.status === "shipped")?._count ?? 0,
    delivered: statusGroups.find((g) => g.status === "delivered")?._count ?? 0,
    cancelled: statusGroups.find((g) => g.status === "cancelled")?._count ?? 0,
    refunded: statusGroups.find((g) => g.status === "refunded")?._count ?? 0,
  } satisfies IShoppingMallSellerOrderAnalytic["status_breakdown"];
  // Calculate average order value
  const averageOrderValue =
    totalOrderCount > 0 ? totalRevenue / totalOrderCount : null;
  // Get recent orders - query orders that have items from this seller
  const recentOrders = await MyGlobal.prisma.shopping_mall_orders.findMany({
    where: {
      deleted_at: null,
      orderItems: {
        some: {
          shopping_mall_seller_id: props.sellerId,
          deleted_at: null,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: 10,
    ...ShoppingMallOrderAtSummaryTransformer.select(),
  });
  const transformedRecentOrders = await ArrayUtil.asyncMap(
    recentOrders,
    ShoppingMallOrderAtSummaryTransformer.transform,
  );
  return {
    total_order_count: totalOrderCount,
    total_items_sold: totalItemsSold,
    total_revenue: totalRevenue,
    status_breakdown: statusBreakdown,
    average_order_value: averageOrderValue,
    recent_orders: transformedRecentOrders,
  } satisfies IShoppingMallSellerOrderAnalytic;
}
