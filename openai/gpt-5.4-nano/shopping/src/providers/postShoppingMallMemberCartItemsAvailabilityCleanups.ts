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

export async function postShoppingMallMemberCartItemsAvailabilityCleanups(props: {
  member: MemberPayload;
  body: IShoppingMallCartItem.ICreate;
}): Promise<void> {
  const nowIso = toISOStringSafe(new Date());
  const activeCarts = await MyGlobal.prisma.shopping_mall_carts.findMany({
    where: {
      shopping_mall_member_id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (activeCarts.length === 0) {
    return;
  }
  const cartIds = activeCarts.map((c) => c.id);
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: {
      shopping_mall_cart_id: { in: cartIds },
      deleted_at: null,
    },
    select: {
      id: true,
      shopping_mall_cart_id: true,
      shopping_mall_product_variant_id: true,
      quantity: true,
      productVariant: {
        select: {
          deleted_at: true,
          is_active: true,
        },
      },
    },
  });
  if (cartItems.length === 0) {
    return;
  }
  const variantIds = cartItems.map((i) => i.shopping_mall_product_variant_id);
  const uniqueVariantIds = Array.from(new Set(variantIds));
  const invRecords =
    await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: {
        shopping_mall_product_variant_id: { in: uniqueVariantIds },
        deleted_at: null,
      },
      select: {
        shopping_mall_product_variant_id: true,
        available_quantity: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });
  const latestByVariantId = new Map<string, (typeof invRecords)[number]>();
  for (const r of invRecords) {
    if (!latestByVariantId.has(r.shopping_mall_product_variant_id)) {
      latestByVariantId.set(r.shopping_mall_product_variant_id, r);
    }
  }
  const unavailableByItemId = new Map<string, boolean>();
  const unavailableItemIds: string[] = [];
  const unavailableCarts = new Map<string, boolean>();
  for (const item of cartItems) {
    const latest = latestByVariantId.get(item.shopping_mall_product_variant_id);
    const availableQuantity =
      latest === undefined ? 0 : latest.available_quantity;
    const variantUnavailable =
      item.productVariant.deleted_at !== null ||
      item.productVariant.is_active === false ||
      availableQuantity <= 0 ||
      item.quantity > availableQuantity;
    unavailableByItemId.set(item.id, variantUnavailable);
    if (variantUnavailable) {
      unavailableItemIds.push(item.id);
      unavailableCarts.set(item.shopping_mall_cart_id, true);
    } else {
      if (!unavailableCarts.has(item.shopping_mall_cart_id)) {
        unavailableCarts.set(item.shopping_mall_cart_id, false);
      }
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (unavailableItemIds.length > 0) {
      await tx.shopping_mall_cart_items.updateMany({
        where: { id: { in: unavailableItemIds } },
        data: { deleted_at: nowIso },
      });
    }
    const availableItemIds = cartItems
      .filter((i) => unavailableByItemId.get(i.id) === false)
      .map((i) => i.id);
    if (availableItemIds.length > 0) {
      await tx.shopping_mall_cart_items.updateMany({
        where: { id: { in: availableItemIds } },
        data: { deleted_at: null },
      });
    }
    for (const cart of activeCarts) {
      const warning = unavailableCarts.get(cart.id) === true;
      await tx.shopping_mall_carts.update({
        where: { id: cart.id },
        data: { warning_inventory_insufficient: warning },
      });
    }
  });
}
