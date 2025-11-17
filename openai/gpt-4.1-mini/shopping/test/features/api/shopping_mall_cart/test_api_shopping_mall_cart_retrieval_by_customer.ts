import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate the retrieval of a shopping mall cart by the authenticated customer.
 *
 * This test simulates the following realistic business workflow:
 *
 * 1. Register a new customer via the /auth/customer/join endpoint, authenticating
 *    the test session.
 * 2. Create a new shopping mall customer record associated with the authenticated
 *    user.
 * 3. Create a new shopping mall cart tied to the created customer.
 * 4. Retrieve the shopping mall cart details by its unique identifier and verify
 *    data integrity.
 *
 * The test asserts that the cart retrieval returns exactly the cart created
 * earlier, ensuring correct ownership enforcement and data consistency. It
 * handles all API calls asynchronously and confirms correctness using strict
 * typia.assert() and TestValidator.equals() functions. Authentication token
 * handling is automatic via API functions, including token switching.
 */
export async function test_api_shopping_mall_cart_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Step 1. Register a new customer and authenticate
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123",
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const joinResponse: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joinResponse);

  // Step 2. Create a new customer record associated with the authenticated user
  // For this test, we'll create a separate customer record as dependency
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123",
    href: "https://example.com/create",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer =
    await api.functional.shoppingMall.customer.shoppingMallCustomers.create(
      connection,
      { body: customerCreateBody },
    );
  typia.assert(customer);

  // Step 3. Create a new shopping mall cart for the customer
  const cartCreateBody = {} satisfies IShoppingMallCart.ICreate;
  // Session id omitted for simplicity (null)
  const createdCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.shoppingMallCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(createdCart);

  // Step 4. Retrieve the shopping mall cart by ID
  const retrievedCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.shoppingMallCarts.at(
      connection,
      {
        shoppingMallCartId: createdCart.id,
      },
    );
  typia.assert(retrievedCart);

  // Validate the retrieved cart matches the created cart
  TestValidator.equals(
    "retrieved cart id equals created cart id",
    retrievedCart.id,
    createdCart.id,
  );
  TestValidator.equals(
    "retrieved cart's owner matches created customer id",
    retrievedCart.shopping_mall_customer_id,
    customer.id,
  );
}
