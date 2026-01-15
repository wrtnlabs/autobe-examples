import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallVariantAvailability } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantAvailability";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallVariantAvailabilityTransformer {
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
            productId: true,
            warehouse_id: true,
            quantity: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_variant_availabilityFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariantAvailability> {
    return {
      product_variant_id: input.id,
      product_id: input.inventory.productId,
      quantity: input.inventory.quantity,
      status: input.status satisfies
        | "in_stock"
        | "out_of_stock"
        | "pre_order"
        | "discontinued"
        | "backordered" as
        | "in_stock"
        | "out_of_stock"
        | "pre_order"
        | "discontinued"
        | "backordered",
      last_updated_at: toISOStringSafe(input.created_at),
      reserved_quantity: 0,
      minimum_threshold: 0,
      warehouse_id: input.inventory.warehouse_id,
      synced_at: toISOStringSafe(input.updated_at),
      availability_source: undefined,
    };
  }
}
