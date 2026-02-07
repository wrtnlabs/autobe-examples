import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerAvailabilityCleanup(props: {
  customer: CustomerPayload;
  body: IShoppingMallInventoryHistory.ICleanupRequest;
}): Promise<IShoppingMallInventoryHistory.ICleanupResponse> {
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  // 1. Update product variants with stock = 0 to mark as inactive
  const inactiveVariantsResult =
    await MyGlobal.prisma.shopping_mall_product_variants.updateMany({
      where: {
        stock_quantity: 0,
        is_active: true,
        deleted_at: null,
      },
      data: {
        is_active: false,
        updated_at: now,
      },
    });
  // 2. Get list of inactive variant IDs for subsequent operations
  const inactiveVariantIds =
    await MyGlobal.prisma.shopping_mall_product_variants
      .findMany({
        where: {
          stock_quantity: 0,
          is_active: false,
          deleted_at: null,
        },
        select: { id: true },
      })
      .then((variants) =>
        variants.map((v) => v.id as string & tags.Format<"uuid">),
      );
  // 3. Remove cart items where the variant is no longer available
  let removedCartItemsResult = { count: 0 };
  if (inactiveVariantIds.length > 0) {
    removedCartItemsResult =
      await MyGlobal.prisma.shopping_mall_carts.deleteMany({
        where: {
          shopping_mall_product_variant_id: { in: inactiveVariantIds },
          deleted_at: null,
        },
      });
  }
  // 4. Get product IDs with no active variants for wishlist cleanup
  const productIdsWithNoActiveVariants =
    await MyGlobal.prisma.shopping_mall_products
      .findMany({
        where: {
          variants: {
            none: {
              is_active: true,
              deleted_at: null,
            },
          },
          deleted_at: null,
        },
        select: { id: true },
      })
      .then((products) =>
        products.map((p) => p.id as string & tags.Format<"uuid">),
      );
  // 5. Remove wishlist entries where the product has no available variants
  let removedWishlistEntriesResult = { count: 0 };
  if (productIdsWithNoActiveVariants.length > 0) {
    removedWishlistEntriesResult =
      await MyGlobal.prisma.shopping_mall_wishlists.deleteMany({
        where: {
          shopping_mall_product_id: { in: productIdsWithNoActiveVariants },
          deleted_at: null,
        },
      });
  }
  // 6. Update inventory history records for inactive variants
  let inventoryRecordsUpdated = 0;
  if (inactiveVariantIds.length > 0) {
    const inventoryUpdateResult =
      await MyGlobal.prisma.shopping_mall_inventory_histories.updateMany({
        where: {
          shopping_mall_product_variant_id: { in: inactiveVariantIds },
          deleted_at: null,
        },
        data: {
          updated_at: now,
        },
      });
    inventoryRecordsUpdated = inventoryUpdateResult.count;
  }
  // Return cleanup summary (empty object as per DTO definition)
  return {};
}
