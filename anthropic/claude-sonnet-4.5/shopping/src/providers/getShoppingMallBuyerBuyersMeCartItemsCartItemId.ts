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

export async function getShoppingMallBuyerBuyersMeCartItemsCartItemId(props: {
  buyer: BuyerPayload;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCartItem> {
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: {
      id: props.cartItemId,
    },
  });

  if (!cartItem || cartItem.deleted_at !== null) {
    throw new HttpException("Cart item not found", 404);
  }

  if (cartItem.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: cartItem.id,
    shopping_mall_buyer_id: cartItem.shopping_mall_buyer_id,
    shopping_mall_sale_sku_id: cartItem.shopping_mall_sale_sku_id,
    quantity: cartItem.quantity,
    unit_price_snapshot: cartItem.unit_price_snapshot,
    created_at: toISOStringSafe(cartItem.created_at),
    updated_at: toISOStringSafe(cartItem.updated_at),
    deleted_at:
      cartItem.deleted_at === null
        ? undefined
        : toISOStringSafe(cartItem.deleted_at),
  };
}
