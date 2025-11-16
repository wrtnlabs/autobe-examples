import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function postShoppingMallBuyerBuyersMeCartItems(props: {
  buyer: BuyerPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findUnique({
    where: { id: props.body.shopping_mall_sale_sku_id },
  });

  if (!sku) {
    throw new HttpException("Product SKU not found", 404);
  }

  if (!sku.enabled) {
    throw new HttpException("Product SKU is not available for purchase", 400);
  }

  const existingCartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findFirst({
      where: {
        shopping_mall_buyer_id: props.buyer.id,
        shopping_mall_sale_sku_id: props.body.shopping_mall_sale_sku_id,
        deleted_at: null,
      },
    });

  if (existingCartItem) {
    throw new HttpException("This product is already in your cart", 409);
  }

  const now = new Date();
  const isSaleActive =
    sku.sale_price !== null &&
    sku.sale_start_at !== null &&
    sku.sale_end_at !== null &&
    sku.sale_start_at <= now &&
    sku.sale_end_at >= now;

  const effectivePrice = isSaleActive ? sku.sale_price : sku.base_price;

  if (effectivePrice === null) {
    throw new HttpException("Product price is not available", 400);
  }

  const created = await MyGlobal.prisma.shopping_mall_cart_items.create({
    data: {
      id: v4(),
      shopping_mall_buyer_id: props.buyer.id,
      shopping_mall_sale_sku_id: props.body.shopping_mall_sale_sku_id,
      quantity: props.body.quantity,
      unit_price_snapshot: effectivePrice,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_buyer_id: created.shopping_mall_buyer_id,
    shopping_mall_sale_sku_id: created.shopping_mall_sale_sku_id,
    quantity: created.quantity,
    unit_price_snapshot: created.unit_price_snapshot,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
