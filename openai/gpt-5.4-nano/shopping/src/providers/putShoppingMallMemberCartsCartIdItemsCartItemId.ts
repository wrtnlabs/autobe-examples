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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallMemberCartsCartIdItemsCartItemId(props: {
  member: MemberPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const nowIso = toISOStringSafe(new Date());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const cart = await tx.shopping_mall_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: {
        id: true,
        shopping_mall_member_id: true,
        warning_inventory_insufficient: true,
        deleted_at: true,
      },
    });
    if (cart.shopping_mall_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    if (cart.deleted_at !== null) {
      throw new HttpException("Cart is not active", 400);
    }
    const cartItem = await tx.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        shopping_mall_cart_id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        subtotal_amount: true,
        deleted_at: true,
        updated_at: true,
      },
    });
    if (cartItem.shopping_mall_cart_id !== props.cartId) {
      throw new HttpException("Cart item does not belong to cart", 400);
    }
    if (cartItem.deleted_at !== null) {
      throw new HttpException("Cart item is not active", 400);
    }
    const variant = await tx.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: cartItem.shopping_mall_product_variant_id },
      select: {
        id: true,
        price: true,
        is_active: true,
        deleted_at: true,
      },
    });
    if (!variant.is_active || variant.deleted_at !== null) {
      throw new HttpException("Product variant is not available", 400);
    }
    const removeIntent = props.body.remove === true;
    const nextQuantity = props.body.quantity;
    if (removeIntent) {
      const updated = await tx.shopping_mall_cart_items.update({
        where: { id: cartItem.id },
        data: {
          deleted_at: nowIso,
          updated_at: nowIso,
        },
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
      const activeItems = await tx.shopping_mall_cart_items.findMany({
        where: {
          shopping_mall_cart_id: props.cartId,
          deleted_at: null,
        },
        select: {
          shopping_mall_product_variant_id: true,
          quantity: true,
        },
      });
      let insufficient = false;
      for (const item of activeItems) {
        const v = await tx.shopping_mall_product_variants.findUnique({
          where: { id: item.shopping_mall_product_variant_id },
          select: { is_active: true, deleted_at: true },
        });
        if (v === null || v.deleted_at !== null || !v.is_active) {
          insufficient = true;
          break;
        }
        const inv = await tx.shopping_mall_inventory_records.findFirst({
          where: {
            shopping_mall_product_variant_id:
              item.shopping_mall_product_variant_id,
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
          select: { available_quantity: true },
        });
        const available = inv?.available_quantity ?? 0;
        if (item.quantity > available) {
          insufficient = true;
          break;
        }
      }
      await tx.shopping_mall_carts.update({
        where: { id: props.cartId },
        data: {
          warning_inventory_insufficient: insufficient,
          updated_at: nowIso,
        },
        select: { id: true },
      });
      return {
        id: updated.id,
        shoppingMallCartId: updated.shopping_mall_cart_id,
        shoppingMallProductVariantId: updated.shopping_mall_product_variant_id,
        quantity: updated.quantity,
        subtotalAmount: Number(updated.subtotal_amount),
        createdAt: toISOStringSafe(updated.created_at),
        updatedAt: toISOStringSafe(updated.updated_at),
        deletedAt:
          updated.deleted_at === null
            ? null
            : toISOStringSafe(updated.deleted_at),
      } satisfies IShoppingMallCartItem;
    }
    if (nextQuantity === undefined) {
      throw new HttpException(
        "quantity is required when remove is not set",
        400,
      );
    }
    if (!Number.isInteger(nextQuantity) || nextQuantity < 0) {
      throw new HttpException("Invalid quantity", 400);
    }
    const inv = await tx.shopping_mall_inventory_records.findFirst({
      where: {
        shopping_mall_product_variant_id:
          cartItem.shopping_mall_product_variant_id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      select: { available_quantity: true },
    });
    const availableQuantity = inv?.available_quantity ?? 0;
    if (nextQuantity > availableQuantity) {
      throw new HttpException(
        "Requested quantity exceeds available inventory",
        400,
      );
    }
    const nextSubtotal = variant.price * nextQuantity;
    const updated = await tx.shopping_mall_cart_items.update({
      where: { id: cartItem.id },
      data: {
        quantity: nextQuantity,
        subtotal_amount: nextSubtotal,
        updated_at: nowIso,
      },
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
    const activeItems = await tx.shopping_mall_cart_items.findMany({
      where: {
        shopping_mall_cart_id: props.cartId,
        deleted_at: null,
      },
      select: { shopping_mall_product_variant_id: true, quantity: true },
    });
    let insufficient = false;
    for (const item of activeItems) {
      const v = await tx.shopping_mall_product_variants.findUnique({
        where: { id: item.shopping_mall_product_variant_id },
        select: { is_active: true, deleted_at: true },
      });
      if (v === null || v.deleted_at !== null || !v.is_active) {
        insufficient = true;
        break;
      }
      const inv2 = await tx.shopping_mall_inventory_records.findFirst({
        where: {
          shopping_mall_product_variant_id:
            item.shopping_mall_product_variant_id,
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
        select: { available_quantity: true },
      });
      const available = inv2?.available_quantity ?? 0;
      if (item.quantity > available) {
        insufficient = true;
        break;
      }
    }
    await tx.shopping_mall_carts.update({
      where: { id: props.cartId },
      data: {
        warning_inventory_insufficient: insufficient,
        updated_at: nowIso,
      },
      select: { id: true },
    });
    return {
      id: updated.id,
      shoppingMallCartId: updated.shopping_mall_cart_id,
      shoppingMallProductVariantId: updated.shopping_mall_product_variant_id,
      quantity: updated.quantity,
      subtotalAmount: Number(updated.subtotal_amount),
      createdAt: toISOStringSafe(updated.created_at),
      updatedAt: toISOStringSafe(updated.updated_at),
      deletedAt:
        updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
    } satisfies IShoppingMallCartItem;
  });
}
