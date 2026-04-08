import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce inventory record creation data for E2E testing.
 *
 * Generates a complete IEcommerceInventoryRecord.ICreate with randomized values for
 * quantity_change and reason fields. This is used to test inventory adjustment
 * operations including restocking, order deductions, cancellations, refunds, and
 * manual adjustments.
 *
 * The quantity_change is generated as a non-zero int32 value within typical
 * business ranges (-9999 to +9999), ensuring meaningful inventory movements.
 * The reason field uses realistic business context values from common inventory
 * operation types.
 *
 * @param input Optional partial input to override specific fields
 * @returns Complete IEcommerceInventoryRecord.ICreate object with all required fields
 */
export function prepare_random_ecommerce_inventory_record(
  input?: DeepPartial<IEcommerceInventoryRecord.ICreate>,
): IEcommerceInventoryRecord.ICreate {
  return {
    quantity_change:
      input?.quantity_change ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.ExclusiveMinimum<-9999> &
          tags.ExclusiveMaximum<9999>
      >(),
    reason:
      input?.reason ??
      RandomGenerator.pick([
        "restock",
        "order",
        "cancel",
        "refund",
        "adjustment",
        "loss",
      ] as const),
  };
}
