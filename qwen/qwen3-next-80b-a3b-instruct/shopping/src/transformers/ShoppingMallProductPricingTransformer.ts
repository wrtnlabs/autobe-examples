import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductPricing } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPricing";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductPricingTransformer {
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
  ): Promise<IShoppingMallProductPricing> {
    return {
      basePrice: input.price,
      currency: "USD",
      discountedPrice: undefined,
      discountPercentage: undefined,
      variant_id: input.variant.id,
    };
  }
}
