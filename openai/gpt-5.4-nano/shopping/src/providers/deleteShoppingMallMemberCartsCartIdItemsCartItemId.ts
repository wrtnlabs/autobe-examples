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
    const cartItem = await tx.shopping_mall_cart_items.findFirst({
      where: {
        id: props.cartItemId,
        shopping_mall_cart_id: props.cartId,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        subtotal_amount: true,
      },
    });
    if (cartItem === null) {
      throw new HttpException("Not Found", 404);
    }
    await tx.shopping_mall_cart_items.update({
      where: { id: props.cartItemId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
      select: { id: true },
    });
    const remainingItems = await tx.shopping_mall_cart_items.findMany({
      where: {
        shopping_mall_cart_id: props.cartId,
        deleted_at: null,
      },
      select: {
        shopping_mall_product_variant_id: true,
        quantity: true,
        subtotal_amount: true,
      },
    });
    const variantIds = remainingItems.map(
      (item) => item.shopping_mall_product_variant_id,
    );
    const uniqueVariantIds = Array.from(new Set(variantIds));
    const inventoryRecords = await tx.shopping_mall_inventory_records.findMany({
      where: {
        shopping_mall_product_variant_id: { in: uniqueVariantIds },
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      select: {
        shopping_mall_product_variant_id: true,
        available_quantity: true,
        created_at: true,
      },
    });
    const latestByVariant = new Map<
      string,
      {
        available_quantity: number;
        created_at: Date;
      }
    >();
    for (const r of inventoryRecords) {
      if (!latestByVariant.has(r.shopping_mall_product_variant_id)) {
        latestByVariant.set(r.shopping_mall_product_variant_id, {
          available_quantity: r.available_quantity,
          created_at: r.created_at,
        });
      }
    }
    let warning_inventory_insufficient = false;
    for (const item of remainingItems) {
      const latest = latestByVariant.get(item.shopping_mall_product_variant_id);
      const available = latest?.available_quantity ?? 0;
      if (item.quantity > available) {
        warning_inventory_insufficient = true;
        break;
      }
    }
    const remainingSubtotal = remainingItems.reduce(
      (sum, item) => sum + item.subtotal_amount,
      0,
    );
    // cart totals are not stored in schema; ensure derived state is recomputed
    await tx.shopping_mall_carts.update({
      where: { id: props.cartId },
      data: {
        warning_inventory_insufficient,
        updated_at: now,
      },
      select: { id: true, warning_inventory_insufficient: true },
    });
    void remainingSubtotal;
  });
}
