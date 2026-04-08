import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform product snapshot variant creation data for E2E testing.
 *
 * Generates a complete IMallPlatformProductSnapshotVariant.ICreate payload for
 * historical SKU snapshot rows. Any field may be overridden through DeepPartial
 * input, and omitted fields are filled with realistic random values.
 */
export function prepare_random_mall_platform_product_snapshot_variant(
  input?: DeepPartial<IMallPlatformProductSnapshotVariant.ICreate> | undefined,
): IMallPlatformProductSnapshotVariant.ICreate {
  return {
    skuCode: input?.skuCode ?? RandomGenerator.alphaNumeric(12),
    optionValues:
      input?.optionValues ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 6,
      }),
    priceOverride:
      input?.priceOverride !== undefined
        ? input.priceOverride
        : typia.random<number | null>(),
    isAvailable: input?.isAvailable ?? typia.random<boolean>(),
  };
}
