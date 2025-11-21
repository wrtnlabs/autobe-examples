import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test removing cart item from empty shopping cart.
 *
 * This E2E test validates the error handling behavior when attempting to remove
 * a cart item from an empty shopping cart. The test creates a customer account,
 * establishes an empty shopping cart, and then attempts to remove a
 * non-existent item to verify proper error response handling.
 */
export async function test_api_cart_item_removal_empty_cart(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create empty shopping cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_session_id: customer.id,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 3: Attempt to remove non-existent item from empty cart
  await TestValidator.error(
    "should fail when removing non-existent item from empty cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.erase(connection, {
        cartId: cart.id,
        itemId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
