import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductVariantAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
        cartItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs,
        inventoryRecords: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        options: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_product_variantsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProductVariant.ISummary> {
    return {
      id: input.id,
      sku_code: input.sku_code,
      price_override: input.price_override ?? null,
      stock_quantity: input.stock_quantity,
    };
  }
}
