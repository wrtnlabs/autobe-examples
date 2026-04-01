import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCategoryAtSummaryTransformer } from "./ShoppingMallCategoryAtSummaryTransformer";

export namespace ShoppingMallProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_product_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        product: {
          select: {
            base_price: true,
            variants: {
              select: {
                price_override: true,
              },
            } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        category: ShoppingMallCategoryAtSummaryTransformer.select(),
        snapshotVariants: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_product_snapshot_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot.ISummary> {
    const variantPrices = input.product.variants
      .map((v) => v.price_override)
      .filter((p): p is number => p !== null);
    const minPrice =
      variantPrices.length > 0
        ? Math.min(...variantPrices)
        : input.product.base_price;
    const maxPrice =
      variantPrices.length > 0
        ? Math.max(...variantPrices)
        : input.product.base_price;
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      created_at: toISOStringSafe(input.created_at),
      product: {
        min: minPrice,
        max: maxPrice,
      } satisfies IShoppingMallProduct.ISummary,
      category: await ShoppingMallCategoryAtSummaryTransformer.transform(
        input.category,
      ),
    };
  }
}
