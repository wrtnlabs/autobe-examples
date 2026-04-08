import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform category creation data for E2E testing.
 *
 * Generates a complete IMallPlatformCategory.ICreate object with realistic
 * default values while allowing test cases to override any field through
 * DeepPartial input.
 */
export function prepare_random_mall_platform_category(
  input?: DeepPartial<IMallPlatformCategory.ICreate> | undefined,
): IMallPlatformCategory.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    parentCategoryId: input?.parentCategoryId ?? null,
  };
}
