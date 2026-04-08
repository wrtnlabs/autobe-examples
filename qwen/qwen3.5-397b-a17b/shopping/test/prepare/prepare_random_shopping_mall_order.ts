import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall order creation data for E2E testing.
 *
 * Generates a complete IShoppingMallOrder.ICreate with randomized values. This DTO
 * represents the minimal request payload for placing a new order through checkout.
 *
 * The order items are automatically derived from the customer's active shopping cart,
 * so this request only needs to specify the shipping address reference. The system
 * calculates totals, generates order codes, and creates the order atomically.
 *
 * @param input Optional partial input for test-time customization
 * @returns Complete IShoppingMallOrder.ICreate object for order creation
 */
export function prepare_random_shopping_mall_order(
  input?: DeepPartial<IShoppingMallOrder.ICreate>,
): IShoppingMallOrder.ICreate {
  return {
    shopping_mall_customer_address_id:
      input?.shopping_mall_customer_address_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
