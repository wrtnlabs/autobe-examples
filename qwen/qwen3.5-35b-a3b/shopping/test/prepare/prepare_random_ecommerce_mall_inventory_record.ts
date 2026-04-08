import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_inventory_record(
  input?: DeepPartial<IEcommerceMallInventoryRecord.ICreate> | undefined,
): IEcommerceMallInventoryRecord.ICreate {
  const OPERATION_TYPES = ["RESTOCK", "ADJUSTMENT", "LOSS"] as const;
  return {
    quantity_change:
      input?.quantity_change ??
      (Math.random() > 0.5
        ? typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>()
        : typia.random<number & tags.Type<"int32"> & tags.Maximum<-1>>()),
    operation_type:
      input?.operation_type ?? RandomGenerator.pick(OPERATION_TYPES),
    reference_id:
      input?.reference_id ??
      (Math.random() > 0.7
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
    notes:
      input?.notes ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
  };
}
