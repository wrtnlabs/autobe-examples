import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
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

export async function postShoppingMallMemberCartFromWishlists(props: {
  member: MemberPayload;
  body: IShoppingMallCart.ICreateFromWishlist;
}): Promise<IShoppingMallCart> {
  const shoppingMallMemberId: string & tags.Format<"uuid"> = props.member.id;
  const member = await MyGlobal.prisma.shopping_mall_members.findFirstOrThrow({
    where: { id: shoppingMallMemberId, deleted_at: null },
    select: { id: true },
  });
  const wishlistItems =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findMany({
      where: {
        deleted_at: null,
        wishlist: { shopping_mall_member_id: member.id, deleted_at: null },
      },
      select: {
        shopping_mall_product_id: true,
        product: {
          select: {
            productVariants: {
              select: {
                id: true,
                is_active: true,
                deleted_at: true,
                shopping_mall_product_id: true,
                inventoryRecords: {
                  select: {
                    available_quantity: true,
                    reserved_quantity: true,
                    deleted_at: true,
                    created_at: true,
                  },
                },
                price: true,
              },
            },
          },
        },
      },
    });
  if (wishlistItems.length === 0) {
    const cart = await MyGlobal.prisma.shopping_mall_carts.findFirstOrThrow({
      where: { shopping_mall_member_id: member.id, deleted_at: null },
    });
    return {
      id: cart.id,
      shopping_mall_member_id: cart.shopping_mall_member_id,
      warning_inventory_insufficient: cart.warning_inventory_insufficient,
      created_at: cart.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: cart.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: cart.deleted_at?.toISOString() ?? null,
      items: null,
    };
  }
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const cart = await tx.shopping_mall_carts.findFirst({
      where: { shopping_mall_member_id: member.id, deleted_at: null },
      select: { id: true, warning_inventory_insufficient: true },
    });
    const cartId: string & tags.Format<"uuid"> = cart?.id ?? (v4() as any);
    const createdCart =
      cart ??
      (await tx.shopping_mall_carts.create({
        data: {
          id: cartId,
          shopping_mall_member_id: member.id,
          warning_inventory_insufficient: false,
          created_at: new Date() as any,
          updated_at: new Date() as any,
          deleted_at: null,
        },
        select: { id: true, warning_inventory_insufficient: true },
      }));
    const cartItemsToReturn: Array<{
      variantId: string;
      quantity: number;
    }> = [];
    for (const witem of wishlistItems) {
      for (const variant of witem.product.productVariants) {
        if (variant.deleted_at !== null) {
          throw new HttpException("Wishlist variant unavailable", 400);
        }
        if (!variant.is_active) {
          throw new HttpException("Wishlist variant unavailable", 400);
        }
        const inv = await tx.shopping_mall_inventory_records.findFirstOrThrow({
          where: {
            shopping_mall_product_variant_id: variant.id,
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
          select: { available_quantity: true },
        });
        const quantity = 1;
        if (inv.available_quantity < quantity) {
          throw new HttpException("Insufficient inventory", 400);
        }
        cartItemsToReturn.push({ variantId: variant.id, quantity });
        const existing = await tx.shopping_mall_cart_items.findFirst({
          where: {
            shopping_mall_cart_id: createdCart.id,
            shopping_mall_product_variant_id: variant.id,
            deleted_at: null,
          },
          select: { id: true, quantity: true },
        });
        if (existing) {
          await tx.shopping_mall_cart_items.update({
            where: { id: existing.id },
            data: {
              quantity: existing.quantity + quantity,
              subtotal_amount: (existing.quantity + quantity) * variant.price,
              updated_at: new Date() as any,
            },
          });
        } else {
          await tx.shopping_mall_cart_items.create({
            data: {
              id: v4() as any,
              shopping_mall_cart_id: createdCart.id,
              shopping_mall_product_variant_id: variant.id,
              quantity,
              subtotal_amount: quantity * variant.price,
              created_at: new Date() as any,
              updated_at: new Date() as any,
              deleted_at: null,
            },
          });
        }
      }
    }
    const updatedCart = await tx.shopping_mall_carts.findFirstOrThrow({
      where: { id: createdCart.id, deleted_at: null },
      select: {
        id: true,
        shopping_mall_member_id: true,
        warning_inventory_insufficient: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return {
      cart: updatedCart,
    };
  });
  const cart = result.cart;
  return {
    id: cart.id,
    shopping_mall_member_id: cart.shopping_mall_member_id,
    warning_inventory_insufficient: cart.warning_inventory_insufficient,
    created_at: cart.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: cart.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: cart.deleted_at?.toISOString() ?? null,
    items: null,
  };
}
