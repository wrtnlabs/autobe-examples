import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall checkout data for E2E testing.
 *
 * Generates a complete IShoppingMallCheckout.ICreate with randomized values
 * for checkout process testing. The checkout request contains shipping address
 * selection and payment token for order placement.
 *
 * - `shopping_mall_customer_address_id`: UUID reference to customer's shipping address
 * - `payment_token`: Payment gateway token for processing order payment
 *
 * All properties can be overridden via the input parameter for specific test scenarios.
 */
export function prepare_random_shopping_mall_checkout(
  input?: DeepPartial<IShoppingMallCheckout.ICreate> | undefined,
): IShoppingMallCheckout.ICreate {
  return {
    shopping_mall_customer_address_id:
      input?.shopping_mall_customer_address_id ??
      typia.random<string & tags.Format<"uuid">>(),
    payment_token: input?.payment_token ?? RandomGenerator.alphaNumeric(32),
  };
}
