import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random inventory record creation data for E2E testing.
 *
 * Generates a complete IMallPlatformInventoryRecord.ICreate with realistic
 * inventory movement data. Callers may override any field through a
 * DeepPartial input, while unspecified values are generated automatically.
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
