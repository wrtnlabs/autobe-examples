import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import { IPageIShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingOrderSplit";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminOrdersOrderCodeSplits(props: {
  admin: AdminPayload;
  orderCode: string;
  body: IShoppingOrderSplit.IRequest;
}): Promise<IPageIShoppingOrderSplit.ISummary> {
  const { admin, orderCode, body } = props;

  // 1. Find shopping_order by orderCode
  const order = await MyGlobal.prisma.shopping_orders.findUnique({
    where: { order_code: orderCode },
    select: { id: true, deleted_at: true },
  });
  if (!order || order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Build 'where' condition
  const where: Record<string, any> = {
    shopping_order_id: order.id,
    deleted_at: null,
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && { shopping_seller_id: body.seller_id }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // 3. Sorting
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "subtotal_price",
    "status",
  ];
  const sort_by =
    allowedSortFields.includes(body.sort_by ?? "") && body.sort_by
      ? body.sort_by
      : "created_at";
  const sort_direction = body.sort_direction === "asc" ? "asc" : "desc";

  // 4. Pagination
  const page = body.page;
  const page_size = body.page_size;
  const skip = (Number(page) - 1) * Number(page_size);
  const take = Number(page_size);

  // 5. Query records and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_order_splits.findMany({
      where,
      orderBy: { [sort_by]: sort_direction as "asc" | "desc" },
      skip,
      take,
      select: {
        id: true,
        shopping_order_id: true,
        shopping_seller_id: true,
        split_code: true,
        subtotal_price: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_order_splits.count({ where }),
  ]);

  // 6. Map result to ISummary
  const data = rows.map((split) => ({
    id: split.id,
    shopping_order_id: split.shopping_order_id,
    shopping_seller_id: split.shopping_seller_id,
    split_code: split.split_code,
    subtotal_price: split.subtotal_price,
    status: split.status,
    created_at: toISOStringSafe(split.created_at),
    updated_at: toISOStringSafe(split.updated_at),
  }));

  // 7. Pagination metadata
  const pages = Math.ceil(total / Number(page_size));

  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages,
    },
    data,
  };
}
