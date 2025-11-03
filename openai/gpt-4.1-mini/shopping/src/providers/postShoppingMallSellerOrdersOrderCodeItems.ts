import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerOrdersOrderCodeItems(props: {
  seller: SellerPayload;
  orderCode: string;
  body: IShoppingMallOrderItem.ICreate;
}): Promise<IShoppingMallOrderItem> {
  const { seller, orderCode, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_code: orderCode },
    select: { id: true },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findUnique({
    where: { id: body.shopping_mall_product_sku_id },
    select: {
      id: true,
      shopping_mall_product_id: true,
    },
  });

  if (!sku) {
    throw new HttpException("Product SKU not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_order_items.create({
    data: {
      id: v4(),
      shopping_mall_order_id: order.id,
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
      quantity: body.quantity,
      unit_price: body.unit_price,
      total_price: body.total_price,
      created_at: body.created_at ? toISOStringSafe(body.created_at) : now,
      updated_at: body.updated_at ? toISOStringSafe(body.updated_at) : now,
      deleted_at: body.deleted_at ?? null,
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
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
