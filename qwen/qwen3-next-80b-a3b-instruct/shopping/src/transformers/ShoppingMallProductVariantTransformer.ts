import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantTransformer {
  export type Payload = Prisma.shopping_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: true,
        shopping_mall_product_variant_attributes: true,
        shopping_mall_product_variant_inventory: true,
        shopping_mall_product_variant_pricing: true,
        shopping_mall_variant_skus: true,
        shopping_mall_variant_inventory: true,
        shopping_mall_variant_pricing: true,
        shopping_mall_variant_templates: true,
        shopping_mall_variant_audit_logs: true,
        shopping_mall_cart_items: true,
        shopping_mall_wishlist_items: true,
        shopping_mall_order_items: true,
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariant> {
    return {
      price: input.shopping_mall_product_variant_pricing?.price ?? 0,
      quantity: input.shopping_mall_product_variant_inventory?.quantity ?? 0,
    };
  }
}
