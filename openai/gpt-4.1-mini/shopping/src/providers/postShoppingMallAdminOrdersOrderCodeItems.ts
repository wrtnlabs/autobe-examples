import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminOrdersOrderCodeItems(props: {
  admin: AdminPayload;
  orderCode: string;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const { admin, orderCode, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException(`Order with orderCode ${orderCode} not found`, 404);
  }

  const newId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: newId,
      shopping_mall_order_id: order.id,
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
      quantity: body.quantity,
      unit_price: body.unit_price,
      total_price: body.total_price,
      created_at:
        body.created_at !== undefined && body.created_at !== null
          ? toISOStringSafe(body.created_at)
          : now,
      updated_at:
        body.updated_at !== undefined && body.updated_at !== null
          ? toISOStringSafe(body.updated_at)
          : now,
      deleted_at: body.deleted_at === undefined ? null : body.deleted_at,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_product_sku_id: created.shopping_mall_product_sku_id,
    quantity: created.quantity,
    unit_price: created.unit_price,
    total_price: created.total_price,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
