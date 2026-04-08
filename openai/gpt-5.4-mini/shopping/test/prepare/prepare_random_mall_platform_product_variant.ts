import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform product variant creation data for E2E testing.
 *
 * Generates a complete IMallPlatformProductVariant.ICreate object with a unique
 * SKU code, human-readable option values, and an optional price override.
 * Test code may override any field through a DeepPartial input while keeping
 * all unspecified fields realistically generated.
 */
export function prepare_random_mall_platform_product_variant(
  input?: DeepPartial<IMallPlatformProductVariant.ICreate> | undefined,
): IMallPlatformProductVariant.ICreate {
  return {
    skuCode: input?.skuCode ?? RandomGenerator.alphaNumeric(12),
    optionValues: input?.optionValues ?? RandomGenerator.name(2),
    priceOverride: input?.priceOverride ?? null,
  };
}
