import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberCartsCartIdItemsCartItemId(props: {
  member: MemberPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const cart = await tx.shopping_mall_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: {
        id: true,
        shopping_mall_member_id: true,
        deleted_at: true,
        warning_inventory_insufficient: true,
      },
    });
    if (cart.deleted_at !== null)
      throw new HttpException("Cart is deleted", 400);
    if (cart.shopping_mall_member_id !== props.member.id)
      throw new HttpException("Forbidden", 403);
    const cartItem = await tx.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        shopping_mall_cart_id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        subtotal_amount: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
    });
    if (cartItem.shopping_mall_cart_id !== props.cartId)
      throw new HttpException("Cart item does not belong to this cart", 400);
    if (cartItem.deleted_at !== null)
      throw new HttpException("Cart item is deleted", 400);
    const variant = await tx.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: cartItem.shopping_mall_product_variant_id },
      select: { id: true, price: true, is_active: true, deleted_at: true },
    });
    if (variant.deleted_at !== null || !variant.is_active)
      throw new HttpException("Product variant unavailable", 400);
    const remove = props.body.remove ?? false;
    const now = toISOStringSafe(new Date());
    if (remove) {
      await tx.shopping_mall_cart_items.update({
        where: { id: cartItem.id },
        data: { deleted_at: now, updated_at: now },
        select: {
          id: true,
          shopping_mall_cart_id: true,
          shopping_mall_product_variant_id: true,
          quantity: true,
          subtotal_amount: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    } else {
      const nextQuantity = props.body.quantity;
      if (nextQuantity === undefined)
        throw new HttpException(
          "quantity is required when remove is false",
          400,
        );
      await tx.shopping_mall_cart_items.update({
        where: { id: cartItem.id },
        data: {
          quantity: nextQuantity,
          subtotal_amount: variant.price * nextQuantity,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    const updatedItem = await tx.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...ShoppingMallCartItemTransformer.select(),
    });
    const warning = cart.warning_inventory_insufficient;
    await tx.shopping_mall_carts.update({
      where: { id: cart.id },
      data: { warning_inventory_insufficient: warning },
    });
    return ShoppingMallCartItemTransformer.transform(updatedItem as any);
  });
}
