import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductVariantSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_variant_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        stock_quantity: true,
        created_at: true,
        productVariant: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_product_variant_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariantSnapshot.ISummary> {
    return {
      id: input.id,
      shoppingMallProductVariantId: input.shopping_mall_product_variant_id,
      skuCode: input.sku_code,
      optionValues: input.option_values,
      priceOverride: input.price_override ?? null,
      stockQuantity: input.stock_quantity,
      createdAt: input.created_at.toISOString(),
    };
  }
}
