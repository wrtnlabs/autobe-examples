import { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random inventory record creation data for E2E testing.
 *
 * Generates a complete IECommerceMallInventoryRecord.ICreate with randomized
 * values representing a stock movement for a product variant.
 *
 * The {@link quantity_change} defaults to a positive integer (restocking scenario),
 * and the {@link reason} defaults to a descriptive paragraph explaining the stock
 * movement with business context. Both properties can be overridden via the
 * optional `input` parameter for test-specific scenarios such as negative
 * adjustments (purchases, damage) or custom reasons.
 *
 * @param input - Partial overrides for test customization via DeepPartial
 * @returns A fully populated IECommerceMallInventoryRecord.ICreate
 */
export function prepare_random_ecommerce_mall_inventory_record(
  input?: DeepPartial<IECommerceMallInventoryRecord.ICreate>,
): IECommerceMallInventoryRecord.ICreate {
  return {
    quantity_change:
      input?.quantity_change ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.ExclusiveMinimum<0> &
          tags.Maximum<10000>
      >(),
    reason:
      input?.reason ??
      `Seller restock - ${RandomGenerator.paragraph({ sentences: 2 })}`,
  };
}
