import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallVariantSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSkus";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallVariantSkusTransformer {
  export type Payload = Prisma.shopping_mall_variant_skusGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku: true,
        created_at: true,
        updated_at: true,
        variant: {
          select: {
            product_id: true,
            price: true,
            stock_quantity: true,
            reserved_quantity: true,
            is_active: true,
            category_id: true,
            brand_id: true,
            seller_id: true,
            availability_status: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_variant_skusFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallVariantSkus> {
    return {
      id: input.id,
      sku: input.sku,
      product_id: input.variant.product_id,
      price: input.variant.price,
      stock_quantity: input.variant.stock_quantity,
      reserved_quantity: input.variant.reserved_quantity ?? undefined,
      is_active: input.variant.is_active,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      category_id: input.variant.category_id,
      brand_id: input.variant.brand_id,
      seller_id: input.variant.seller_id,
      availability_status: input.variant.availability_status,
    };
  }
}
