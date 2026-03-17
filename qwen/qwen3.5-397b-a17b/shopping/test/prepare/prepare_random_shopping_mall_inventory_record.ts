import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_inventory_record(
  input?: DeepPartial<IShoppingMallInventoryRecord.ICreate>,
): IShoppingMallInventoryRecord.ICreate {
  return {
    quantity_change:
      input?.quantity_change ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<-100> & tags.Maximum<100>
      >(),
    reason:
      input?.reason ??
      RandomGenerator.pick([
        "RESTOCK",
        "ORDER",
        "ADJUSTMENT",
        "CANCELLATION",
        "REFUND",
        "LOSS",
      ] as const),
    reference_id:
      input?.reference_id !== undefined
        ? input.reference_id
        : Math.random() < 0.5
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
  };
}
