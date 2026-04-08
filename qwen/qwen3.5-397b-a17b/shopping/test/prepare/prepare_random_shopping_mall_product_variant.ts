import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall product variant creation data for E2E testing.
 *
 * Generates a complete IShoppingMallProductVariant.ICreate with randomized values for
 * variant testing scenarios. The function supports partial input overrides for
 * customizable test cases while providing realistic default values.
 *
 * The shopping_mall_product_id is generated as a random UUID for general endpoint
 * testing. The sku_code is a 12-character alphanumeric string unique within the product.
 * The option_values follow a human-readable format like 'Color: Red, Size: Large'.
 * The price randomly alternates between null (use base price) and a positive number
 * for variant-specific pricing scenarios.
 */
export function prepare_random_shopping_mall_product_variant(
  input?: DeepPartial<IShoppingMallProductVariant.ICreate>,
): IShoppingMallProductVariant.ICreate {
  return {
    shopping_mall_product_id:
      input?.shopping_mall_product_id ??
      typia.random<string & tags.Format<"uuid">>(),
    sku_code: input?.sku_code ?? RandomGenerator.alphaNumeric(12),
    option_values:
      input?.option_values ??
      `Color: ${RandomGenerator.pick(["Red", "Blue", "Green", "Black", "White"] as const)}, Size: ${RandomGenerator.pick(["Small", "Medium", "Large", "XL"] as const)}`,
    price:
      input?.price !== undefined
        ? input.price
        : RandomGenerator.pick([
            null,
            typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<1000> &
                tags.Maximum<999999>
            >(),
          ] as const),
  };
}
