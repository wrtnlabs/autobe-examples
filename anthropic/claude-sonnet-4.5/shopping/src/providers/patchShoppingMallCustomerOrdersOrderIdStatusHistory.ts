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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdStatusHistory(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatusHistory.IRequest;
}): Promise<IPageIShoppingMallOrderStatusHistory> {
  const { customer, orderId, body } = props;

  // Verify order exists and belongs to customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only view status history for your own orders",
      403,
    );
  }

  // Extract pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause with proper date filtering
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_status_history.findMany({
      where: {
        shopping_mall_order_id: orderId,
        ...(body.new_status !== undefined &&
          body.new_status !== null && {
            new_status: body.new_status,
          }),
        ...((body.start_date !== undefined || body.end_date !== undefined) && {
          created_at: {
            ...(body.start_date !== undefined && { gte: body.start_date }),
            ...(body.end_date !== undefined && { lte: body.end_date }),
          },
        }),
      },
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_status_history.count({
      where: {
        shopping_mall_order_id: orderId,
        ...(body.new_status !== undefined &&
          body.new_status !== null && {
            new_status: body.new_status,
          }),
        ...((body.start_date !== undefined || body.end_date !== undefined) && {
          created_at: {
            ...(body.start_date !== undefined && { gte: body.start_date }),
            ...(body.end_date !== undefined && { lte: body.end_date }),
          },
        }),
      },
    }),
  ]);

  // Transform records to match DTO (optional nullable fields return undefined when null)
  const data: IShoppingMallOrderStatusHistory[] = records.map((record) => ({
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
  }));

  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
