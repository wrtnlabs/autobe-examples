import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductOptionValueAtSummaryTransformer } from "./ShoppingMallProductOptionValueAtSummaryTransformer";

export namespace ShoppingMallProductOptionDefinitionTransformer {
  export type Payload =
    Prisma.shopping_mall_product_option_definitionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        product: {
          select: {
            id: true,
            base_price: true,
            variants: {
              select: {
                price_override: true,
              },
            } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        optionValues:
          ShoppingMallProductOptionValueAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_product_option_definitionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductOptionDefinition> {
    const prices = input.product.variants
      .map((v) => v.price_override)
      .filter((p): p is number => p !== null);
    const minPrice =
      prices.length > 0
        ? Math.min(...prices)
        : Number(input.product.base_price);
    const maxPrice =
      prices.length > 0
        ? Math.max(...prices)
        : Number(input.product.base_price);
    return {
      id: input.id,
      shopping_mall_product_id: input.product.id,
      name: input.name,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      product: {
        min: minPrice,
        max: maxPrice,
      } satisfies IShoppingMallProduct.ISummary,
      optionValues: await ArrayUtil.asyncMap(
        input.optionValues,
        ShoppingMallProductOptionValueAtSummaryTransformer.transform,
      ),
    };
  }
}
