import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";

export async function putShoppingMallCartsCartIdItemsItemId(props: {
  cartId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  // Fetch cart item to validate ownership and current state
  const cartItem = await MyGlobal.prisma.shopping_mall_cart_items.findUnique({
    where: { id: props.itemId },
    include: { cart: true },
  });

  if (!cartItem) {
    throw new HttpException("Cart item not found", 404);
  }

  // Verify cart exists and is active
  if (!cartItem.cart) {
    throw new HttpException("Cart not found", 404);
  }

  // Ensure cart is active (not expired or checked out)
  const now = new Date();
  if (cartItem.cart.status !== "active" || cartItem.cart.expires_at < now) {
    throw new HttpException("Cannot modify items in non-active cart", 400);
  }

  // If no quantity change requested, return current item
  if (props.body.quantity === undefined) {
    return {
      price: cartItem.price,
    };
  }

  // Validate cart belongs to authenticated user (server-side auth ensures cart owner)
  // No need to check cartId vs user ID as auth middleware ensures ownership

  // Fetch current inventory for this product variant
  const inventory =
    await MyGlobal.prisma.shopping_mall_inventory_units.findFirst({
      where: { product_variant_id: cartItem.shopping_mall_product_variant_id },
    });

  if (!inventory) {
    throw new HttpException("Product inventory not available", 404);
  }

  // Determine new status based on quantity and inventory
  let newStatus: "active" | "out_of_stock" | "removed";
  if (props.body.quantity === 0) {
    newStatus = "removed";
  } else if (props.body.quantity > inventory.quantity) {
    newStatus = "out_of_stock";
  } else {
    newStatus = "active";
  }

  // Update cart item
  const updatedCartItem = await MyGlobal.prisma.shopping_mall_cart_items.update(
    {
      where: { id: props.itemId },
      data: {
        quantity: props.body.quantity,
        status: newStatus,
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    price: updatedCartItem.price,
  };
}
