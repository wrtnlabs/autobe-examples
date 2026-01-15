import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantInventory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantInventoryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_variant_inventoryGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        inventory_count: true,
        state: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productVariant: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_variant_inventoryFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantInventory> {
    const availabilityStatus =
      input.state === "available"
        ? "green"
        : input.state === "low_stock"
          ? "yellow"
          : input.state === "out_of_stock"
            ? "red"
            : "red";
    return {
      quantity: input.inventory_count,
      availability_status: availabilityStatus,
      low_stock_threshold: 5, // default based on industry standard
      backorder_allowed: true, // default based on typical policy
      min_order_quantity: 1, // default minimum is always 1
      max_order_quantity: 0, // 0 means unlimited (per common spec)
    };
  }
}
