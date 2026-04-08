import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random inventory record creation data for E2E testing.
 *
 * Generates a complete IMallPlatformInventoryRecord.ICreate object with a
 * signed inventory change and a realistic business reason. Test code may
 * override either field through a DeepPartial input while missing properties are
 * filled with safe random defaults.
 *
 * @param input DeepPartial overrides for customizing the generated payload.
 * @returns A complete inventory record creation DTO.
 */
export function prepare_random_mall_platform_inventory_record(
  input?: DeepPartial<IMallPlatformInventoryRecord.ICreate> | undefined,
): IMallPlatformInventoryRecord.ICreate {
  return {
    quantityChange:
      input?.quantityChange ?? typia.random<number & tags.Type<"int32">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
