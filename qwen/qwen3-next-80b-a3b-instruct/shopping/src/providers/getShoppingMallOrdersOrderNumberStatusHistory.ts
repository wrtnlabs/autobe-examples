import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";

export async function getShoppingMallOrdersOrderNumberStatusHistory(props: {
  orderNumber: string;
}): Promise<IPageIShoppingMallOrderStatusHistory> {
  // Find the order by orderNumber
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_number: props.orderNumber },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Extract pagination parameters (default to IPage.IPagination defaults)
  // In practice, these would come from query, but endpoint signature does not expose them - using defaults
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // Query status history records for this order
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_history.findMany({
      where: { shopping_mall_order_id: order.id },
      orderBy: { created_at: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_status_history.count({
      where: { shopping_mall_order_id: order.id },
    }),
  ]);

  // Transform records to match IShoppingMallOrderStatusHistory DTO
  const transformedRecords = records.map((record) => ({
    orderId: record.shopping_mall_order_id,
    previousStatus: record.previous_status,
    newStatus: record.new_status,
    changedBy: record.created_by,
    changedAt: toISOStringSafe(record.created_at),
    reason: record.status_change_reason || undefined,
  }));

  // Construct pagination object
  const pagination: IPage.IPagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data: transformedRecords,
  };
}
