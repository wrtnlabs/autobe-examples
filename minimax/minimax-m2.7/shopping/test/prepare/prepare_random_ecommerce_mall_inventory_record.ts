import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_inventory_record(
  input?: DeepPartial<IEcommerceMallInventoryRecord.ICreate>,
): IEcommerceMallInventoryRecord.ICreate {
  return {
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    operationType:
      input?.operationType ??
      RandomGenerator.pick(["restock", "adjustment"] as const),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
