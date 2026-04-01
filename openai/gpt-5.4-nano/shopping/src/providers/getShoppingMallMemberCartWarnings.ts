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
import { ShoppingMallCartItemAtSummaryTransformer } from "../transformers/ShoppingMallCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberCartWarnings(props: {
  member: MemberPayload;
}): Promise<IShoppingMallCart> {
  const member = await MyGlobal.prisma.shopping_mall_members.findUnique({
    where: { id: props.member.id },
    select: { id: true },
  });
  if (!member) {
    throw new HttpException("Forbidden", 403);
  }
  const cart = await MyGlobal.prisma.shopping_mall_carts.findFirst({
    where: {
      shopping_mall_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      warning_inventory_insufficient: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      shopping_mall_member_id: true,
    },
  });
  if (!cart) {
    return {
      id: v4() as unknown as string & tags.Format<"uuid">,
      shopping_mall_member_id: props.member.id,
      warning_inventory_insufficient: false,
      created_at: toISOStringSafe(new Date()) as unknown as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as unknown as string &
        tags.Format<"date-time">,
      deleted_at: null,
      items: null,
    };
  }
  const items = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: { shopping_mall_cart_id: cart.id, deleted_at: null },
    select: {
      id: true,
      shopping_mall_product_variant_id: true,
      quantity: true,
      subtotal_amount: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      cart: { select: { id: true } },
      productVariant: {
        select: {
          id: true,
          is_active: true,
          deleted_at: true,
        },
      },
    },
  });
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        id: { in: items.map((i) => i.shopping_mall_product_variant_id) },
        deleted_at: null,
      },
      select: { id: true, is_active: true, deleted_at: true },
    });
  const nowMap = new Map<
    string,
    {
      available_quantity: number;
    }
  >();
  for (const item of items) {
    const latest =
      await MyGlobal.prisma.shopping_mall_inventory_records.findFirst({
        where: {
          shopping_mall_product_variant_id:
            item.shopping_mall_product_variant_id,
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
        select: { available_quantity: true },
      });
    nowMap.set(item.shopping_mall_product_variant_id, {
      available_quantity: latest?.available_quantity ?? 0,
    });
  }
  const computedItems = await Promise.all(
    items.map(async (it) => {
      const inv = nowMap.get(it.shopping_mall_product_variant_id);
      const currentAvailableQuantity = inv?.available_quantity ?? 0;
      const variant = variants.find(
        (v) => v.id === it.shopping_mall_product_variant_id,
      );
      const isVariantActive =
        (variant?.is_active ?? false) && variant?.deleted_at == null;
      const isItemUnavailable =
        !isVariantActive || currentAvailableQuantity <= 0;
      const isQuantityExceedStock = it.quantity > currentAvailableQuantity;
      const itemDto = await ShoppingMallCartItemAtSummaryTransformer.transform({
        ...it,
        subtotal_amount: it.subtotal_amount,
        shopping_mall_product_variant_id: it.shopping_mall_product_variant_id,
        shopping_mall_cart_id: cart.id,
      } as any);
      return {
        ...itemDto,
        current_available_quantity: currentAvailableQuantity,
        is_quantity_exceed_stock: isQuantityExceedStock,
        is_unavailable: isItemUnavailable,
      };
    }),
  );
  const cartWarning = computedItems.some(
    (x) => x.is_quantity_exceed_stock || x.is_unavailable,
  );
  return {
    id: cart.id,
    shopping_mall_member_id: cart.shopping_mall_member_id,
    warning_inventory_insufficient: cartWarning,
    created_at: toISOStringSafe(cart.created_at) as unknown as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(cart.updated_at) as unknown as string &
      tags.Format<"date-time">,
    deleted_at: cart.deleted_at
      ? (toISOStringSafe(cart.deleted_at) as unknown as string &
          tags.Format<"date-time">)
      : null,
    items: computedItems as any,
  };
}
