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
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      shopping_mall_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_member_id: true,
      warning_inventory_insufficient: true,
    },
  });
  if (cart === null) {
    throw new HttpException("Cart not found", 404);
  }
  const requestedItems = props.body.items;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    for (const rawItem of requestedItems) {
      // IShoppingMallCartItem.IRequest shape mismatch: narrow only primitive properties that are used.
      const itemAny = rawItem as unknown as Record<string, unknown>;
      const shopping_mall_cart_item_id = typia.assert<string>(
        (itemAny.shopping_mall_cart_item_id ?? itemAny["id"]) as unknown,
      );
      if (
        shopping_mall_cart_item_id === null ||
        shopping_mall_cart_item_id === (null as unknown as string)
      ) {
        throw new HttpException("shopping_mall_cart_item_id is required", 400);
      }
      const quantity = typia.assert<number>(itemAny.quantity as unknown);
      if (
        quantity === null ||
        (quantity as unknown as number) === (null as unknown as number)
      ) {
        throw new HttpException("quantity is required", 400);
      }
      const existing = await tx.shopping_mall_cart_items.findFirst({
        where: {
          id: shopping_mall_cart_item_id,
          shopping_mall_cart_id: cart.id,
          deleted_at: null,
        },
        select: {
          id: true,
          quantity: true,
          shopping_mall_product_variant_id: true,
          productVariant: {
            select: {
              price: true,
              is_active: true,
              deleted_at: true,
            },
          },
        },
      });
      if (existing === null) {
        throw new HttpException("Cart item not found", 404);
      }
      if (
        existing.productVariant.deleted_at !== null ||
        existing.productVariant.is_active === false
      ) {
        throw new HttpException("Variant is unavailable", 400);
      }
      await tx.shopping_mall_cart_items.update({
        where: { id: existing.id },
        data: {
          quantity,
          subtotal_amount: existing.productVariant.price * quantity,
          updated_at: new Date(),
        },
      });
    }
    const updatedCart = await tx.shopping_mall_carts.findUniqueOrThrow({
      where: { id: cart.id },
      select: {
        id: true,
        shopping_mall_member_id: true,
        warning_inventory_insufficient: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: { select: { id: true } },
        cartItems: { select: { id: true } },
      },
    });
    return await ShoppingMallCartTransformer.transform(updatedCart);
  });
}
