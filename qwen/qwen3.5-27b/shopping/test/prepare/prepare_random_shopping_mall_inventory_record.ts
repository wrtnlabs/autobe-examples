import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall inventory record creation data for E2E testing.
 *
 * Generates a complete IShoppingMallInventoryRecord.ICreate with randomized values
 * for inventory tracking. The quantity_change represents stock adjustments (positive
 * for increases like restocking, negative for decreases like adjustments), and the
 * reason provides human-readable context for the audit trail.
 */
export function prepare_random_shopping_mall_inventory_record(
  input?: DeepPartial<IShoppingMallInventoryRecord.ICreate> | undefined,
): IShoppingMallInventoryRecord.ICreate {
  return {
    quantity_change:
      input?.quantity_change ??
      (() => {
        let value: number;
        do {
          value = typia.random<
            number & tags.Type<"int32"> & tags.Minimum<-100> & tags.Maximum<100>
          >();
        } while (value === 0);
        return value;
      })(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
