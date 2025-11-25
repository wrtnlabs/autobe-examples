import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCartsCartIdItemsItemId(props: {
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
  });

  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }

  if (cart.status !== "active") {
    throw new HttpException("Cart is not active", 400);
  }

  if (cart.expires_at <= new Date()) {
    throw new HttpException("Cart has expired", 400);
  }

  const item = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: props.itemId },
  });

  if (!item || item.shopping_mall_cart_id !== props.cartId) {
    throw new HttpException("Item not found in cart", 404);
  }

  await MyGlobal.prisma.shopping_mall_cart_items.delete({
    where: { id: props.itemId },
  });
}
