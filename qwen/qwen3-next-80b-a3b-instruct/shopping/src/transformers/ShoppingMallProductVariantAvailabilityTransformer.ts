import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductVariantAvailability } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAvailability";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantAvailabilityTransformer {
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
            inventoryCount: true,
            estimatedRestockDate: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_variant_availabilityFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantAvailability> {
    return {
      status: input.status as
        | "in_stock"
        | "low_stock"
        | "out_of_stock"
        | "backorder",
      quantity: input.inventory.inventoryCount,
      lastUpdated: toISOStringSafe(input.updated_at),
      estimatedRestockDate:
        toISOStringSafe(input.inventory.estimatedRestockDate) ?? null,
    };
  }
}
