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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberCartWarningsRefresh(props: {
  member: MemberPayload;
  body: IShoppingMallCart.IRequest;
}): Promise<IShoppingMallCart.ISummary> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const cart = await tx.shopping_mall_carts.findFirstOrThrow({
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
      },
    });
    const cartItems = await tx.shopping_mall_cart_items.findMany({
      where: {
        shopping_mall_cart_id: cart.id,
        deleted_at: null,
      },
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
      },
    });
    if (cartItems.length === 0) {
      const updatedCart = await tx.shopping_mall_carts.update({
        where: { id: cart.id },
        data: {
          warning_inventory_insufficient: false,
          updated_at: new Date(),
        },
        select: {
          id: true,
          warning_inventory_insufficient: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
      return {
        id: updatedCart.id,
        warning_inventory_insufficient:
          updatedCart.warning_inventory_insufficient,
        created_at: toISOStringSafe(updatedCart.created_at),
        updated_at: toISOStringSafe(updatedCart.updated_at),
        deleted_at: updatedCart.deleted_at
          ? toISOStringSafe(updatedCart.deleted_at)
          : null,
      };
    }
    const distinctVariantIds = Array.from(
      new Set(cartItems.map((i) => i.shopping_mall_product_variant_id)),
    );
    const variants = await tx.shopping_mall_product_variants.findMany({
      where: {
        id: { in: distinctVariantIds },
      },
      select: {
        id: true,
        is_active: true,
        deleted_at: true,
      },
    });
    const inventoryRecords = await tx.shopping_mall_inventory_records.findMany({
      where: {
        shopping_mall_product_variant_id: { in: distinctVariantIds },
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        shopping_mall_product_variant_id: true,
        available_quantity: true,
        created_at: true,
      },
    });
    const inventoryByVariantId = inventoryRecords.reduce<
      Map<
        string,
        {
          available_quantity: number;
        }
      >
    >((map, r) => {
      if (!map.has(r.shopping_mall_product_variant_id)) {
        map.set(r.shopping_mall_product_variant_id, {
          available_quantity: r.available_quantity,
        });
      }
      return map;
    }, new Map());
    const variantById = new Map(variants.map((v) => [v.id, v] as const));
    let warningInventoryInsufficient = false;
    for (const item of cartItems) {
      const variant = variantById.get(item.shopping_mall_product_variant_id);
      const latestInventory = inventoryByVariantId.get(
        item.shopping_mall_product_variant_id,
      );
      const isVariantUnavailable =
        variant === undefined ||
        variant.deleted_at !== null ||
        variant.is_active === false ||
        latestInventory === undefined ||
        latestInventory.available_quantity <= 0;
      if (isVariantUnavailable) {
        // Per requirement, unavailable should supersede warnings.
        // Cart-level flag also reflects insufficiency.
        warningInventoryInsufficient = true;
        continue;
      }
      const availableQuantity = latestInventory.available_quantity;
      if (item.quantity > availableQuantity) {
        warningInventoryInsufficient = true;
      }
    }
    const updatedCart = await tx.shopping_mall_carts.update({
      where: { id: cart.id },
      data: {
        warning_inventory_insufficient: warningInventoryInsufficient,
        updated_at: new Date(),
      },
      select: {
        id: true,
        warning_inventory_insufficient: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    return {
      id: updatedCart.id,
      warning_inventory_insufficient:
        updatedCart.warning_inventory_insufficient,
      created_at: toISOStringSafe(updatedCart.created_at),
      updated_at: toISOStringSafe(updatedCart.updated_at),
      deleted_at: updatedCart.deleted_at
        ? toISOStringSafe(updatedCart.deleted_at)
        : null,
    } satisfies IShoppingMallCart.ISummary;
  });
}
