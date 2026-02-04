import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersMetrics(props: {
  customer: CustomerPayload;
}): Promise<IShoppingMallOrderItem> {
  interface QueryResult {
    orderCount: string;
    totalRevenue: string;
    averageOrderValue: string;
    paid: string;
    shipped: string;
    delivered: string;
    cancelled: string;
    refunded: string;
    partially_completed: string;
  }
  const result = (await MyGlobal.prisma.$queryRaw`
    SELECT
      COUNT(DISTINCT o.id) AS orderCount,
      COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS totalRevenue,
      CASE WHEN COUNT(DISTINCT o.id) > 0 THEN
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) / COUNT(DISTINCT o.id)
      ELSE 0 END AS averageOrderValue,
      SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END) AS paid,
      SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) AS shipped,
      SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
      SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN o.status = 'refunded' THEN 1 ELSE 0 END) AS refunded,
      SUM(CASE WHEN o.status = 'partially_completed' THEN 1 ELSE 0 END) AS partially_completed
    FROM shopping_mall_orders o
    JOIN shopping_mall_order_items oi ON o.id = oi.order_id
    WHERE o.customer_id = ${props.customer.id}
      AND o.status IN ('paid', 'shipped', 'delivered', 'cancelled', 'refunded', 'partially_completed')
      AND o.deleted_at IS NULL
  `) as unknown as QueryResult[];
  return {
    orderCount: Number(result[0]?.orderCount || 0),
    totalRevenue: Number(result[0]?.totalRevenue || 0),
    averageOrderValue: Number(result[0]?.averageOrderValue || 0),
    statusBreakdown: {
      paid: Number(result[0]?.paid || 0),
      shipped: Number(result[0]?.shipped || 0),
      delivered: Number(result[0]?.delivered || 0),
      cancelled: Number(result[0]?.cancelled || 0),
      refunded: Number(result[0]?.refunded || 0),
      partially_completed: Number(result[0]?.partially_completed || 0),
    },
  };
}
