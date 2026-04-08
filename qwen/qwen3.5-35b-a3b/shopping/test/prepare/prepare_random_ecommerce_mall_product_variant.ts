import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product variant creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallProductVariant.ICreate with randomized
 * SKU code, option values, stock quantity, and optional price for testing
 * product variant creation workflows.
 */
export function prepare_random_ecommerce_mall_product_variant(
  input?: DeepPartial<IEcommerceMallProductVariant.ICreate> | undefined,
): IEcommerceMallProductVariant.ICreate {
  return {
    sku_code: input?.sku_code ?? RandomGenerator.alphaNumeric(10),
    option_values:
      input?.option_values ??
      JSON.stringify({
        color: RandomGenerator.alphabets(4),
        size: RandomGenerator.alphabets(2),
      }),
    stock_quantity:
      input?.stock_quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    price:
      input?.price ??
      (Math.random() > 0.3
        ? typia.random<number & tags.ExclusiveMinimum<0>>()
        : null),
  };
}
