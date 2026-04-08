import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random order item snapshot variant option creation data for E2E testing.
 *
 * Generates a complete IMallPlatformOrderItemSnapshotVariantOption.ICreate.
 *
 * The returned object contains realistic option key/value strings, while
 * allowing any field to be overridden through DeepPartial input for test-case
 * customization.
 */
export function prepare_random_mall_platform_order_item_snapshot_variant_option(
  input?:
    | DeepPartial<IMallPlatformOrderItemSnapshotVariantOption.ICreate>
    | undefined,
): IMallPlatformOrderItemSnapshotVariantOption.ICreate {
  return {
    optionName: input?.optionName ?? RandomGenerator.alphabets(6),
    optionValue: input?.optionValue ?? RandomGenerator.name(1),
  };
}
