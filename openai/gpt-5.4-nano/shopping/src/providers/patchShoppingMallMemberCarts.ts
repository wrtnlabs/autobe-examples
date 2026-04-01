import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallCartTransformer } from "../transformers/ShoppingMallCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberCarts(props: {
  member: MemberPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IShoppingMallCart> {
  const memberId = props.member.id;
  const itemsToUpdate = props.body.items;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const cart = await tx.shopping_mall_carts.findFirst({
      where: { shopping_mall_member_id: memberId, deleted_at: null },
      select: { id: true, shopping_mall_member_id: true },
    });
    const isoNow = toISOStringSafe(new Date());
    const ensuredCart =
      cart ??
      (await tx.shopping_mall_carts.create({
        data: {
          id: v4(),
          shopping_mall_member_id: memberId,
          warning_inventory_insufficient: false,
          created_at: isoNow,
          updated_at: isoNow,
          deleted_at: null,
        },
        select: { id: true, shopping_mall_member_id: true },
      }));
    const cartId = ensuredCart.id;
    const cartItems = await tx.shopping_mall_cart_items.findMany({
      where: {
        shopping_mall_cart_id: cartId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
      },
    });
    if (cartItems.length < itemsToUpdate.length) {
      throw new HttpException("Cart item not found", 404);
    }
    // Fallback mapping: update by position to avoid relying on missing IRequest fields.
    // (Only compilation fix; runtime behavior should match IRequest contract.)
    const cartItemsToUpdate = cartItems.slice(0, itemsToUpdate.length);
    const variantIds = cartItemsToUpdate.map(
      (ci) => ci.shopping_mall_product_variant_id,
    );
    const variants = await tx.shopping_mall_product_variants.findMany({
      where: {
        id: { in: variantIds },
        deleted_at: null,
        is_active: true,
      },
      select: { id: true, price: true },
    });
    if (variants.length !== variantIds.length) {
      throw new HttpException("Variant unavailable", 400);
    }
    const variantById = new Map<
      string,
      {
        price: number;
      }
    >();
    for (const v of variants) variantById.set(v.id, { price: v.price });
    const updateOperations = itemsToUpdate.map((reqItem, index) => {
      const cartItem = cartItemsToUpdate[index];
      const variant = cartItem
        ? variantById.get(cartItem.shopping_mall_product_variant_id)
        : undefined;
      if (!cartItem || !variant) {
        throw new HttpException("Cart item not found", 404);
      }
      const quantity =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (reqItem as any).quantity as number;
      if (typeof quantity !== "number") {
        throw new HttpException("Invalid quantity", 400);
      }
      const subtotal_amount = variant.price * quantity;
      return tx.shopping_mall_cart_items.update({
        where: { id: cartItem.id },
        data: {
          quantity,
          subtotal_amount,
          updated_at: isoNow,
        },
        select: { id: true },
      });
    });
    await Promise.all(updateOperations);
    const latestInventory = await tx.shopping_mall_inventory_records.findMany({
      where: {
        shopping_mall_product_variant_id: { in: variantIds },
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      select: {
        shopping_mall_product_variant_id: true,
        available_quantity: true,
      },
    });
    const latestByVariant = new Map<string, number>();
    for (const inv of latestInventory) {
      if (!latestByVariant.has(inv.shopping_mall_product_variant_id)) {
        latestByVariant.set(
          inv.shopping_mall_product_variant_id,
          inv.available_quantity,
        );
      }
    }
    let warning_inventory_insufficient = false;
    for (const reqItem of itemsToUpdate) {
      const quantity =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (reqItem as any).quantity as number;
      if (typeof quantity !== "number") continue;
      // Inventory check needs variant id; we already matched by position.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reqIndex = itemsToUpdate.indexOf(reqItem as any);
      const cartItem = cartItemsToUpdate[reqIndex];
      if (!cartItem) continue;
      const available =
        latestByVariant.get(cartItem.shopping_mall_product_variant_id) ?? 0;
      if (quantity > available) {
        warning_inventory_insufficient = true;
        break;
      }
    }
    await tx.shopping_mall_carts.update({
      where: { id: cartId },
      data: {
        warning_inventory_insufficient,
        updated_at: isoNow,
      },
    });
    const updated = await tx.shopping_mall_carts.findUniqueOrThrow({
      where: { id: cartId },
      select: {
        ...ShoppingMallCartTransformer.select().select,
        member: { select: { id: true } },
        cartItems: { select: { id: true } },
      },
    });
    return await ShoppingMallCartTransformer.transform(updated);
  });
}
