import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductVariantPricing } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantPricing";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantPricingTransformer {
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
  ): Promise<IShoppingMallProductVariantPricing> {
    return {
      id: input.id,
      variant_id: input.variant.id,
      base_price: input.price,
      sale_price: input.price,
      currency: "USD", // Fallback - no currency field in DB
      tax_included: false, // Fallback - no tax_included field in DB
      is_available: input.deleted_at === null,
      effective_date: input.created_at.toISOString(),
      expiration_date: input.updated_at.toISOString(),
      promotion_id: "00000000-0000-0000-0000-000000000000", // Fallback: sentinel UUID for required field
      discount_amount: 0, // Fallback - no discount fields in DB
      discount_percentage: 0, // Fallback - no discount fields in DB
      region_id: "00000000-0000-0000-0000-000000000000", // Fallback: sentinel UUID for required field
    };
  }
}
