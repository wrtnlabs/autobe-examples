import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validates retrieval of a shopping cart by its ID as the authenticating
 * customer owner.
 *
 * The test involves several steps:
 *
 * 1. Register a new shopping mall customer via the /auth/customer/join endpoint.
 * 2. Create a new shopping cart entity linked to the authenticated customer's
 *    session.
 * 3. Retrieve the shopping cart by its UUID via
 *    /shoppingMall/customer/shoppingCarts/{id} endpoint.
 * 4. Verify the retrieved cart matches the created cart in properties including
 *    customer id, session id, and items.
 *
 * Edge cases:
 *
 * - Attempting retrieval with a different authenticated customer results in
 *   access denied.
 * - Attempting retrieval without authentication fails authorization.
 */
export async function test_api_shopping_cart_retrieve_by_owner(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    nickname: RandomGenerator.name(2),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(customer);

  // 2. Create shopping cart linked to the customer's session
  // Need to retrieve customer session from token or customer data
  const session = customer.token
    ? await Promise.resolve(typia.random<IShoppingMallCustomerSession>())
    : null;
  // Because session is not returned from join explicitly, create cart directly referencing customer id and customer session id

  // We must acquire a session via the response or follow assumption: Since the join endpoint provides customer with token but does not provide explicit session, we generate cart with customer id and some generated uuid session.

  // For type safety and coherence, we simulate creation of a valid customer session id for testing.
  const shoppingMallCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // But cannot assume the session id arbitrarily. So retrieve session info from somewhere?
  // Given only customer info with token, we will create a new cart with the customer id and the same session ID used in the cart creation

  // We have a problem: The IShoppingMallShoppingCart.ICreate requires 'shopping_mall_customer_session_id' which we don't have a direct value from customer joining.
  // Thus we must assume the session id is the cart id or generated id?
  // Given from scenario and above the customer session is retrieved (from what?), since no direct API, we recreate it by fetching it from the cart after creation? No.
  // Hence, let's simulate a manually generated session id for cart creation, using typia.random with UUID.

  // Generate customer session id
  const customerSessionId = typia.random<string & tags.Format<"uuid">>();

  // Using IShoppingMallShoppingCart.ICreate for cart creation
  const cartCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_customer_session_id: customerSessionId,
  } satisfies IShoppingMallShoppingCart.ICreate;

  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // Ensure created cart's customer and session id match request
  TestValidator.equals(
    "shopping cart customer id",
    cart.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "shopping cart customer session id",
    cart.shopping_mall_customer_session_id,
    customerSessionId,
  );

  // The cart should initially have no cart items
  TestValidator.predicate(
    "is shopping cart items list empty",
    !cart.shopping_mall_cart_items ||
      cart.shopping_mall_cart_items.length === 0,
  );

  // 3. Retrieve the cart from its id as the same customer
  const cartRetrieved: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.at(connection, {
      id: cart.id,
    });
  typia.assert(cartRetrieved);

  // Validate the cart matches
  TestValidator.equals("retrieved cart id", cartRetrieved.id, cart.id);
  TestValidator.equals(
    "retrieved cart customer id",
    cartRetrieved.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "retrieved cart session id",
    cartRetrieved.shopping_mall_customer_session_id,
    customerSessionId,
  );

  // Items list should be empty
  TestValidator.predicate(
    "retrieved cart items list empty",
    !cartRetrieved.shopping_mall_cart_items ||
      cartRetrieved.shopping_mall_cart_items.length === 0,
  );

  // 4. As a different customer, verify that retrieving this cart is denied
  const otherCustomerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    nickname: RandomGenerator.name(2),
  } satisfies IShoppingMallCustomer.ICreate;
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerBody,
    });
  typia.assert(otherCustomer);

  // Attempt to retrieve the cart by other customer should fail
  await TestValidator.error("other customer cannot access cart", async () => {
    await api.functional.shoppingMall.customer.shoppingCarts.at(connection, {
      id: cart.id,
    });
  });

  // 5. As an unauthenticated connection, attempt to retrieve cart should fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated user cannot access cart",
    async () => {
      await api.functional.shoppingMall.customer.shoppingCarts.at(
        unauthenticatedConnection,
        {
          id: cart.id,
        },
      );
    },
  );
}
