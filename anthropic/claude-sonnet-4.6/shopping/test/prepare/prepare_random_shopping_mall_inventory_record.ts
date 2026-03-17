import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_inventory_record(
  input?: DeepPartial<IShoppingMallInventoryRecord.ICreate> | undefined,
): IShoppingMallInventoryRecord.ICreate {
  return {
    quantity:
      input?.quantity ??
      RandomGenerator.pick([-1, 1] as const) *
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
    note:
      input?.note !== undefined
        ? input.note
        : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
