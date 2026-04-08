import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product variant creation data for E2E testing.
 *
 * Generates a complete IMallPlatformProductVariant.ICreate object while
 * allowing callers to override any field through DeepPartial input.
 */
export function prepare_random_mall_platform_product_variant(
  input?: DeepPartial<IMallPlatformProductVariant.ICreate> | undefined,
): IMallPlatformProductVariant.ICreate {
  return {
    skuCode: input?.skuCode ?? RandomGenerator.alphaNumeric(12).toUpperCase(),
    optionValues:
      input?.optionValues ??
      RandomGenerator.pick([
        "Red / Large",
        "Blue / Small",
        "Black / Medium",
        "White / XL",
      ] as const),
    priceOverride:
      input?.priceOverride === undefined
        ? typia.random<number & tags.Type<"double"> & tags.Minimum<1>>()
        : input.priceOverride,
  };
}
