import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderReturn";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";

export async function patchShoppingMallCustomerOrdersOrderNumberReturns(props: {
  orderNumber: string;
}): Promise<IPageIShoppingMallOrderReturn> {
  // Find the order by order_number
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Define allowed return statuses (exclude denied and completed)
  const allowedStatuses = [
    "requested",
    "approved",
    "awaiting_return",
    "received",
    "refunded",
  ];

  // Get total count and data for pagination
  const [returns, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_returns.findMany({
      where: {
        shopping_mall_order_id: order.id,
        return_status: { in: allowedStatuses },
      },
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.shopping_mall_order_returns.count({
      where: {
        shopping_mall_order_id: order.id,
        return_status: { in: allowedStatuses },
      },
    }),
  ]);

  // Map returns to IShoppingMallOrderReturn format - return only the ID as a string per definition
  const mappedReturns = returns.map((r) => r.id);

  // Return paginated result per IPageIShoppingMallOrderReturn
  return {
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: Math.ceil(total / 100),
    },
    data: mappedReturns,
  };
}
