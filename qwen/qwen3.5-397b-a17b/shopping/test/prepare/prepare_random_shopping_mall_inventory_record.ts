import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall inventory record creation data for E2E testing.
 *
 * Generates a complete IShoppingMallInventoryRecord.ICreate with randomized values for restocking product variants. The quantity_delta represents units being added to inventory, and the reason provides audit trail context for the inventory movement.
 *
 * Common reason codes include 'RESTOCK' for new inventory arrivals, 'ADJUSTMENT' for manual corrections, 'DAMAGED' for damaged goods, 'LOST' for lost inventory, 'ORDER_CANCELLATION' for stock returned from cancelled orders, and 'ORDER_REFUND' for stock returned from refunded orders.
 */
export function prepare_random_shopping_mall_inventory_record(
  input?: DeepPartial<IShoppingMallInventoryRecord.ICreate>,
): IShoppingMallInventoryRecord.ICreate {
  return {
    quantity_delta:
      input?.quantity_delta ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    reason:
      input?.reason ??
      RandomGenerator.pick([
        "RESTOCK",
        "ADJUSTMENT",
        "DAMAGED",
        "LOST",
        "ORDER_CANCELLATION",
        "ORDER_REFUND",
      ] as const),
  };
}
