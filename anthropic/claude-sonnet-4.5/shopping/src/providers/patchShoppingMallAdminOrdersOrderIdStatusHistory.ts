import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdStatusHistory(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingMallOrderStatusHistory> {
  const { admin, orderId, body } = props;

  // Validate order exists
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderId },
  });

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build date range filter
  const dateFilter =
    body.start_date || body.end_date
      ? {
          created_at: {
            ...(body.start_date && { gte: body.start_date }),
            ...(body.end_date && { lte: body.end_date }),
          },
        }
      : {};

  // Build where clause
  const whereClause = {
    shopping_mall_order_id: orderId,
    ...dateFilter,
    ...(body.new_status && {
      new_status: body.new_status,
    }),
  };

  // Execute concurrent queries
  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_history.findMany({
      where: whereClause,
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_status_history.count({
      where: whereClause,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((record) => ({
      id: record.id,
      shopping_mall_order_id: record.shopping_mall_order_id,
      shopping_mall_customer_id: record.shopping_mall_customer_id ?? undefined,
      shopping_mall_seller_id: record.shopping_mall_seller_id ?? undefined,
      shopping_mall_admin_id: record.shopping_mall_admin_id ?? undefined,
      previous_status: record.previous_status ?? undefined,
      new_status: record.new_status,
      change_reason: record.change_reason ?? undefined,
      notes: record.notes ?? undefined,
      is_system_generated: record.is_system_generated,
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
