import { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform product variant option creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformProductVariantOption.ICreate with randomized attribute key and value pairs. These key-value pairs define specific option configurations for product variants, such as color/Red or size/Large.
 *
 * Both `attributeKey` and `attributeValue` accept test-time overrides via the `input` parameter. When not overridden, random alphabetic strings are generated.
 */
export function prepare_random_ecommerce_platform_product_variant_option(
  input?:
    | DeepPartial<IEcommercePlatformProductVariantOption.ICreate>
    | undefined,
): IEcommercePlatformProductVariantOption.ICreate {
  return {
    attributeKey: input?.attributeKey ?? RandomGenerator.alphabets(8),
    attributeValue: input?.attributeValue ?? RandomGenerator.alphabets(8),
  };
}
