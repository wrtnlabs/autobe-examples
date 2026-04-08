import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce product variant creation data for E2E testing.
 *
 * Generates a complete IEcommerceProductVariant.ICreate with randomized values
 * representing a specific product variant (SKU) with option combinations.
 *
 * The function supports partial input overrides through DeepPartial, allowing
 * test cases to customize specific properties while auto-generating the rest.
 * All properties are test-customizable since they represent business data.
 */
export function prepare_random_ecommerce_product_variant(
  input?: DeepPartial<IEcommerceProductVariant.ICreate> | undefined,
): IEcommerceProductVariant.ICreate {
  return {
    sku_code:
      input?.sku_code ??
      RandomGenerator.alphaNumeric(8) + "-" + RandomGenerator.alphabets(4),
    option_values:
      input?.option_values ??
      "color=" +
        RandomGenerator.name(1) +
        ";size=" +
        RandomGenerator.pick(["Small", "Medium", "Large", "X-Large"] as const),
    price:
      input?.price ??
      (RandomGenerator.pick([true, false])
        ? typia.random<
            number &
              tags.Type<"double"> &
              tags.Minimum<0> &
              tags.Maximum<999999.99>
          >()
        : null),
  };
}
