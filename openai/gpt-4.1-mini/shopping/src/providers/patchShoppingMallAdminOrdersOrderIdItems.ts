import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminOrdersOrderIdItems(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IRequest;
}): Promise<IPageIShoppingMallOrderItem> {
  const { admin, orderId, body } = props;

  const page = (body as any).page ?? 1;
  const limit = (body as any).limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    shopping_mall_order_id: orderId,
    ...(body.shopping_mall_sku_id !== undefined &&
      body.shopping_mall_sku_id !== null && {
        shopping_mall_sku_id: body.shopping_mall_sku_id,
      }),
    ...(body.quantity !== undefined &&
      body.quantity !== null && {
        quantity: body.quantity,
      }),
    ...(body.unit_price !== undefined &&
      body.unit_price !== null && {
        unit_price: body.unit_price,
      }),
    ...(body.total_price !== undefined &&
      body.total_price !== null && {
        total_price: body.total_price,
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: toISOStringSafe(body.created_at_from),
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: toISOStringSafe(body.created_at_to),
              }),
          },
        }
      : {}),
    ...((body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
              body.updated_at_from !== null && {
                gte: toISOStringSafe(body.updated_at_from),
              }),
            ...(body.updated_at_to !== undefined &&
              body.updated_at_to !== null && {
                lte: toISOStringSafe(body.updated_at_to),
              }),
          },
        }
      : {}),
  };

  const allowedOrderFields = [
    "quantity",
    "unit_price",
    "total_price",
    "created_at",
    "updated_at",
  ];
  const orderByField = allowedOrderFields.includes(body.orderBy ?? "")
    ? body.orderBy!
    : "created_at";

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_items.findMany({
      where,
      orderBy: {
        [orderByField]: "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({ where }),
  ]);

  const data = items.map((item) => ({
    id: item.id,
    shopping_mall_order_id: item.shopping_mall_order_id,
    shopping_mall_sku_id: item.shopping_mall_sku_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
