import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

/**
 * End-to-end test for shopping cart creation linked to a registered customer.
 *
 * This test fully covers:
 *
 * 1. Registering a new customer via the /auth/customer/join endpoint.
 * 2. Creating a new shopping cart linked to the authenticated customer's ID.
 * 3. Verifying the linkage between the created cart and registered customer.
 * 4. Validating that creating a duplicate cart for the same customer results in an
 *    error.
 *
 * Steps:
 *
 * - Generate a random valid email and password for customer registration.
 * - Call the join API to register and authenticate the customer.
 * - Use the customer's ID from the join response to create a shopping cart.
 * - Assert the created cart's shopping_mall_customer_id matches the customer's
 *   ID.
 * - Attempt to create another cart with the same customer ID and expect an error,
 *   verifying that duplicate carts are disallowed.
 *
 * This test ensures data integrity, proper authentication handling, and API
 * validation logic for shopping cart creation.
 */
export async function test_api_shopping_cart_customer_create(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer and authenticate
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(12);

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // Step 2: Create a new shopping cart linked to the authenticated customer
  const createCartBody = {
    shopping_mall_customer_id: customer.id,
    session_id: null,
  } satisfies IShoppingMallShoppingCart.ICreate;

  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: createCartBody,
      },
    );
  typia.assert(cart);

  // Step 3: Verify that the cart is linked to the customer
  TestValidator.equals(
    "cart's shopping_mall_customer_id matches the customer id",
    cart.shopping_mall_customer_id,
    customer.id,
  );

  // Step 4: Attempt to create duplicate cart and expect an error
  await TestValidator.error(
    "duplicate cart creation for same customer should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.create(
        connection,
        {
          body: createCartBody,
        },
      );
    },
  );
}
