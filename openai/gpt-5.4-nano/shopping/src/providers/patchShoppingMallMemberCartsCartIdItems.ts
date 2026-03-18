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
import { ShoppingMallCartItemAtSummaryTransformer } from "../transformers/ShoppingMallCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberCartsCartIdItems(props: {
  member: MemberPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IShoppingMallCartItem.ISummary> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const cart = await tx.shopping_mall_carts.findUniqueOrThrow({
      where: { id: props.cartId },
      select: {
        id: true,
        shopping_mall_member_id: true,
        deleted_at: true,
      },
    });
    if (
      cart.shopping_mall_member_id !== props.member.id ||
      cart.deleted_at !== null
    ) {
      throw new HttpException("Forbidden", 403);
    }
    let warning_inventory_insufficient = false;
    const updatedIds: Array<string & tags.Format<"uuid">> = [];
    for (const item of props.body.items) {
      if (item.shopping_mall_cart_item_id === null) {
        throw new HttpException("shopping_mall_cart_item_id is required", 400);
      }
      if (item.quantity === null) {
        throw new HttpException("quantity is required", 400);
      }
      const cartItem = await tx.shopping_mall_cart_items.findFirstOrThrow({
        where: {
          id: item.shopping_mall_cart_item_id,
          shopping_mall_cart_id: props.cartId,
          deleted_at: null,
        },
        select: {
          id: true,
          shopping_mall_product_variant_id: true,
        },
      });
      const variant = await tx.shopping_mall_product_variants.findUniqueOrThrow(
        {
          where: { id: cartItem.shopping_mall_product_variant_id },
          select: {
            id: true,
            price: true,
            is_active: true,
            deleted_at: true,
          },
        },
      );
      const latestInventory =
        await tx.shopping_mall_inventory_records.findFirst({
          where: {
            shopping_mall_product_variant_id: variant.id,
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
          select: { available_quantity: true },
        });
      const availableQuantity = latestInventory?.available_quantity ?? 0;
      if (
        !variant.is_active ||
        variant.deleted_at !== null ||
        availableQuantity < item.quantity
      ) {
        warning_inventory_insufficient = true;
        await tx.shopping_mall_cart_items.update({
          where: { id: cartItem.id },
          data: {
            deleted_at: new Date(),
            updated_at: new Date(),
          },
        });
      } else {
        const subtotal_amount = variant.price * item.quantity;
        await tx.shopping_mall_cart_items.update({
          where: { id: cartItem.id },
          data: {
            quantity: item.quantity,
            subtotal_amount,
            updated_at: new Date(),
          },
        });
      }
      updatedIds.push(cartItem.id);
    }
    await tx.shopping_mall_carts.update({
      where: { id: cart.id },
      data: {
        warning_inventory_insufficient,
      },
    });
    const updatedRows = await tx.shopping_mall_cart_items.findMany({
      where: {
        shopping_mall_cart_id: props.cartId,
        id: { in: updatedIds },
      },
      ...ShoppingMallCartItemAtSummaryTransformer.select(),
    });
    const first = updatedRows[0];
    return await ShoppingMallCartItemAtSummaryTransformer.transform(first);
  });
}
