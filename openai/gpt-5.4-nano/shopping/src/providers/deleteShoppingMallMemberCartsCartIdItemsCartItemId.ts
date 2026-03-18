import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteShoppingMallMemberCartsCartIdItemsCartItemId(props: {
  member: MemberPayload;
  cartId: string & tags.Format<"uuid">;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    const cart = await tx.shopping_mall_carts.findFirst({
      where: {
        id: props.cartId,
        shopping_mall_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (cart === null) {
      throw new HttpException("Forbidden", 403);
    }
    const cartItemExists = await tx.shopping_mall_cart_items.findFirst({
      where: {
        id: props.cartItemId,
        shopping_mall_cart_id: props.cartId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (cartItemExists === null) {
      throw new HttpException("Not Found", 404);
    }
    await tx.shopping_mall_cart_items.updateMany({
      where: {
        id: props.cartItemId,
        shopping_mall_cart_id: props.cartId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    const remainingItems = await tx.shopping_mall_cart_items.findMany({
      where: {
        shopping_mall_cart_id: props.cartId,
        deleted_at: null,
      },
      select: {
        shopping_mall_product_variant_id: true,
        quantity: true,
      },
    });
    let warningInventoryInsufficient = false;
    for (const item of remainingItems) {
      const variant = await tx.shopping_mall_product_variants.findUnique({
        where: { id: item.shopping_mall_product_variant_id },
        select: { deleted_at: true, is_active: true },
      });
      if (
        variant === null ||
        variant.deleted_at !== null ||
        variant.is_active === false
      ) {
        warningInventoryInsufficient = true;
        break;
      }
      const latestInventoryRecord =
        await tx.shopping_mall_inventory_records.findFirst({
          where: {
            shopping_mall_product_variant_id:
              item.shopping_mall_product_variant_id,
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
          select: { available_quantity: true },
        });
      const availableQuantity =
        latestInventoryRecord === null
          ? 0
          : latestInventoryRecord.available_quantity;
      if (item.quantity > availableQuantity) {
        warningInventoryInsufficient = true;
        break;
      }
    }
    await tx.shopping_mall_carts.update({
      where: { id: props.cartId },
      data: {
        warning_inventory_insufficient: warningInventoryInsufficient,
        updated_at: now,
      },
      select: { id: true },
    });
  });
}
