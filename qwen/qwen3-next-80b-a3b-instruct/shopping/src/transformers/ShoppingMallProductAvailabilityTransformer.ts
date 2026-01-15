import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductAvailability } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAvailability";
import { IShoppingMallProductVariantAvailability } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAvailability";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallProductVariantAvailabilityTransformer } from "./ShoppingMallProductVariantAvailabilityTransformer";

export namespace ShoppingMallProductAvailabilityTransformer {
  export type Payload = Prisma.shopping_mall_variant_availabilityGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        inventory: {
          select: {
            id: true,
            status: true,
            created_at: true,
            updated_at: true,
            inventory_count: true,
            ...ShoppingMallProductVariantAvailabilityTransformer.select()
              .select,
          },
        },
      },
    } satisfies Prisma.shopping_mall_variant_availabilityFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductAvailability> {
    // Map database status to DTO enum
    const statusMap: Record<
      string,
      IShoppingMallProductAvailability["status"]
    > = {
      in_stock: "available",
      low_stock: "low_stock",
      out_of_stock: "out_of_stock",
      backorder: "backorder",
    };
    const status = statusMap[input.status] || "out_of_stock";
    // Use inventory.inventory_count directly for availableQuantity
    // This is a single record, so no array reduction needed
    const availableQuantity = input.inventory.inventory_count;
    // Transform single inventory record into single-element array
    // This satisfies DTO's variantAvailabilities: IShoppingMallProductVariantAvailability[]
    const variantAvailabilities = [
      await ShoppingMallProductVariantAvailabilityTransformer.transform(
        input.inventory,
      ),
    ];
    return {
      productId: input.id,
      status,
      availableQuantity,
      variantAvailabilities,
    };
  }
}
