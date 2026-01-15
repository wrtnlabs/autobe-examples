import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductSnapshotVariantAvailability } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantAvailability";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotVariantAvailabilityTransformer {
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
        inventory: true,
      },
    } satisfies Prisma.shopping_mall_variant_availabilityFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotVariantAvailability> {
    return {
      in_stock: "in_stock",
      low_stock: "low_stock",
      out_of_stock: "out_of_stock",
      backorder: "backorder",
    };
  }
}
