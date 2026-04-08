import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product variant option value for E2E testing.
 *
 * Generates a complete IEcommerceMallProductVariantOptionValue.ICreate with randomized
 * key-value pairs representing product variant attributes like color=Red or size=Large.
 * Both key and value are single words suitable for product variant option specifications.
 *
 * @param input Optional DeepPartial override for test customization
 * @returns Complete ICreate object with randomized key and value
 */
export function prepare_random_ecommerce_mall_product_variant_option_value(
  input?: DeepPartial<IEcommerceMallProductVariantOptionValue.ICreate>,
): IEcommerceMallProductVariantOptionValue.ICreate {
  return {
    key: input?.key ?? RandomGenerator.name(1),
    value: input?.value ?? RandomGenerator.name(1),
  };
}
