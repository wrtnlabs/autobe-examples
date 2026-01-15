import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductSnapshotVariantPrices } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariantPrices";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotVariantPricesTransformer {
  export type Payload = Prisma.shopping_mall_product_variant_pricingGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        variant: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_product_variant_pricingFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshotVariantPrices> {
    return {
      price: input.price,
      variantId: input.variant.id,
    };
  }
}
