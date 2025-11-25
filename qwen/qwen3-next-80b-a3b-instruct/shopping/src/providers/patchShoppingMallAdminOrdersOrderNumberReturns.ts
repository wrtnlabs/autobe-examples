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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderNumberReturns(props: {
  admin: AdminPayload;
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

  // Get all returns for this order with active statuses
  const returns = await MyGlobal.prisma.shopping_mall_order_returns.findMany({
    where: {
      shopping_mall_order_id: order.id,
      return_status: {
        in: [
          "requested",
          "approved",
          "awaiting_return",
          "received",
          "refunded",
        ],
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  // Count total returns for pagination
  const total = await MyGlobal.prisma.shopping_mall_order_returns.count({
    where: {
      shopping_mall_order_id: order.id,
      return_status: {
        in: [
          "requested",
          "approved",
          "awaiting_return",
          "received",
          "refunded",
        ],
      },
    },
  });

  // Transform returns to match IShoppingMallOrderReturn type
  const data = returns.map((ret) => {
    // Since IShoppingMallOrderReturn is defined as string, we need to return a string representation
    // This is a placeholder workaround for the incorrect DTO definition
    return JSON.stringify({
      id: ret.id,
      shopping_mall_order_id: ret.shopping_mall_order_id,
      return_reason: ret.return_reason,
      return_details: ret.return_details,
      return_status: ret.return_status,
      refund_amount: ret.refund_amount,
      return_method: ret.return_method,
      return_tracking_number: ret.return_tracking_number,
      return_tracking_url: ret.return_tracking_url,
      approved_by_admin_id: ret.approved_by_admin_id,
      approved_at: ret.approved_at ? toISOStringSafe(ret.approved_at) : null,
      received_at: ret.received_at ? toISOStringSafe(ret.received_at) : null,
      refund_processed_at: ret.refund_processed_at
        ? toISOStringSafe(ret.refund_processed_at)
        : null,
      created_at: toISOStringSafe(ret.created_at),
      updated_at: toISOStringSafe(ret.updated_at),
    });
  });

  // Default pagination values from IPage.IPagination
  const pagination: IPage.IPagination = {
    current: 1,
    limit: 100,
    records: total,
    pages: Math.ceil(total / 100),
  };

  return {
    pagination,
    data,
  };
}
