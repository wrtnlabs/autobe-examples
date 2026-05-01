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
 * suitable for testing inventory management workflows. The quantity_change can be
 * positive (restocking) or negative (adjustments/losses), and the reason provides
 * context for the inventory change.
 *
 * The generated data passes type-level validation. The controller-level non-zero
 * constraint for quantity_change can be satisfied by overriding through the input
 * parameter when needed during tests.
 */
export function prepare_random_shopping_mall_inventory_record(
  input?: DeepPartial<IShoppingMallInventoryRecord.ICreate>,
): IShoppingMallInventoryRecord.ICreate {
  return {
    quantity_change:
      input?.quantity_change ?? typia.random<number & tags.Type<"int32">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
