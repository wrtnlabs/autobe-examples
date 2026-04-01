import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCartItemCollector } from "../collectors/ShoppingMallCartItemCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberCartsCartIdItems(props: {
  member: MemberPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.ICreate;
}): Promise<IShoppingMallCartItem> {
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUniqueOrThrow({
    where: { id: props.cartId },
    select: { id: true, shopping_mall_member_id: true, deleted_at: true },
  });
  if (cart.shopping_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.quantity < 1) {
    throw new HttpException("Quantity must be a positive integer", 400);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    // Ensure variant is eligible for cart purchase.
    await tx.shopping_mall_product_variants.findFirstOrThrow({
      where: {
        id: props.body.shoppingMallProductVariantId,
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    });
    const cartEntity = { id: cart.id } satisfies IEntity;
    const cartItem = await tx.shopping_mall_cart_items.create({
      data: await ShoppingMallCartItemCollector.collect({
        body: props.body,
        cart: cartEntity,
      }),
      ...ShoppingMallCartItemTransformer.select(),
    });
    const cartItems = await tx.shopping_mall_cart_items.findMany({
      where: { shopping_mall_cart_id: cart.id, deleted_at: null },
      select: { shopping_mall_product_variant_id: true, quantity: true },
    });
    const quantityByVariant = cartItems.reduce((acc, item) => {
      const key = item.shopping_mall_product_variant_id;
      acc.set(key, (acc.get(key) ?? 0) + item.quantity);
      return acc;
    }, new Map<string, number>());
    const variants = [...quantityByVariant.keys()];
    let warning = false;
    if (variants.length > 0) {
      const latestInventoryRecords =
        await tx.shopping_mall_inventory_records.findMany({
          where: {
            shopping_mall_product_variant_id: { in: variants },
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
          select: {
            shopping_mall_product_variant_id: true,
            available_quantity: true,
          },
        });
      const availableByVariant = new Map<string, number>();
      for (const record of latestInventoryRecords) {
        const key = record.shopping_mall_product_variant_id;
        if (!availableByVariant.has(key)) {
          availableByVariant.set(key, record.available_quantity);
        }
      }
      for (const [variantId, totalQuantity] of quantityByVariant.entries()) {
        const available = availableByVariant.get(variantId) ?? 0;
        if (totalQuantity > available) {
          warning = true;
          break;
        }
      }
    }
    await tx.shopping_mall_carts.update({
      where: { id: cart.id },
      data: { warning_inventory_insufficient: warning },
      select: { id: true },
    });
    return cartItem;
  });
  return await ShoppingMallCartItemTransformer.transform(created);
}
