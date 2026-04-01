import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_mall_platform_inventory_record(
  input?: DeepPartial<IMallPlatformInventoryRecord.ICreate> | undefined,
): IMallPlatformInventoryRecord.ICreate {
  return {
    quantityChange:
      input?.quantityChange ?? typia.random<number & tags.Type<"int32">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
