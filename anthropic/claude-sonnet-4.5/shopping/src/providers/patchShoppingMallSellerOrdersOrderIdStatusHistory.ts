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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerOrdersOrderIdStatusHistory(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingMallOrderStatusHistory> {
  const { seller, orderId, body } = props;

  // Validate seller authorization - verify seller owns this order
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_seller_id: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: You can only view status history for your own orders",
      403,
    );
  }

  // Build where clause with filters
  const where = {
    shopping_mall_order_id: orderId,
    ...((body.start_date !== undefined && body.start_date !== null) ||
    (body.end_date !== undefined && body.end_date !== null)
      ? {
          created_at: {
            ...(body.start_date !== undefined &&
              body.start_date !== null && {
                gte: body.start_date,
              }),
            ...(body.end_date !== undefined &&
              body.end_date !== null && {
                lte: body.end_date,
              }),
          },
        }
      : {}),
    ...(body.new_status !== undefined &&
      body.new_status !== null && {
        new_status: body.new_status,
      }),
  };

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Fetch status history with pagination
  const [histories, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_history.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_status_history.count({
      where,
    }),
  ]);

  // Transform to API response format
  const data: IShoppingMallOrderStatusHistory[] = histories.map((history) => ({
    id: history.id,
    shopping_mall_order_id: history.shopping_mall_order_id,
    shopping_mall_customer_id:
      history.shopping_mall_customer_id === null
        ? undefined
        : history.shopping_mall_customer_id,
    shopping_mall_seller_id:
      history.shopping_mall_seller_id === null
        ? undefined
        : history.shopping_mall_seller_id,
    shopping_mall_admin_id:
      history.shopping_mall_admin_id === null
        ? undefined
        : history.shopping_mall_admin_id,
    previous_status:
      history.previous_status === null ? undefined : history.previous_status,
    new_status: history.new_status,
    change_reason:
      history.change_reason === null ? undefined : history.change_reason,
    notes: history.notes === null ? undefined : history.notes,
    is_system_generated: history.is_system_generated,
    created_at: toISOStringSafe(history.created_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
