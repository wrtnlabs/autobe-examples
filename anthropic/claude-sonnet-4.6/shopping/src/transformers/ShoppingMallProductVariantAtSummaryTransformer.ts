import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductVariantOptionAtSummaryTransformer } from "./ShoppingMallProductVariantOptionAtSummaryTransformer";

export namespace ShoppingMallProductVariantAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sku: true,
        price_override: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        options: ShoppingMallProductVariantOptionAtSummaryTransformer.select(),
        inventoryRecords: {
          select: {
            quantity: true,
          },
        } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductVariant.ISummary> {
    const stockQuantity = Math.max(
      0,
      input.inventoryRecords.reduce((sum, r) => sum + r.quantity, 0),
    );
    return {
      id: input.id,
      sku: input.sku,
      price_override: input.price_override,
      options: await ArrayUtil.asyncMap(
        input.options,
        ShoppingMallProductVariantOptionAtSummaryTransformer.transform,
      ),
      inStock: stockQuantity > 0,
      stockQuantity,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
