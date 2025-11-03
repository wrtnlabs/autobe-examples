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
 * Validate shopping cart retrieval by a customer.
 *
 * This test validates that an authenticated customer can successfully retrieve
 * the details of their shopping cart by its UUID. It follows the complete
 * workflow from customer registration, cart creation, and detailed retrieval.
 *
 * Steps:
 *
 * 1. Register a new customer with unique email and nickname.
 * 2. Create a shopping cart for that customer and their session.
 * 3. Retrieve the cart by ID and validate ownership.
 * 4. Assert the retrieved cart's properties match the created cart.
 * 5. Validate the associated shopping cart items and customer session linkage.
 */
export async function test_api_shopping_cart_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customerAuthorized);

  // Step 2: Create a shopping cart for the customer
  const cartCreateBody = {
    shopping_mall_customer_id: customerAuthorized.id,
    shopping_mall_customer_session_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies IShoppingMallShoppingCart.ICreate;

  const createdCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(createdCart);

  // Step 3: Retrieve the created shopping cart by its ID
  const retrievedCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.at(connection, {
      id: createdCart.id,
    });
  typia.assert(retrievedCart);

  // Step 4: Validate retrieved data matches created data
  TestValidator.equals(
    "shopping cart id matches",
    retrievedCart.id,
    createdCart.id,
  );
  TestValidator.equals(
    "shopping mall customer id matches",
    retrievedCart.shopping_mall_customer_id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "shopping mall customer session id matches",
    retrievedCart.shopping_mall_customer_session_id,
    cartCreateBody.shopping_mall_customer_session_id,
  );

  // Step 5: Validate shopping cart items and customer session linkage
  TestValidator.predicate(
    "shopping cart has shopping_mall_cart_items field",
    retrievedCart.shopping_mall_cart_items !== undefined,
  );
  if (retrievedCart.shopping_mall_cart_items) {
    TestValidator.predicate(
      "shopping cart items array length is non-negative",
      retrievedCart.shopping_mall_cart_items.length >= 0,
    );
  }

  TestValidator.predicate(
    "shopping cart has customerSession field",
    retrievedCart.customerSession !== undefined,
  );
  if (retrievedCart.customerSession) {
    TestValidator.equals(
      "customerSession#shopping_mall_customer_id matches",
      retrievedCart.customerSession.shopping_mall_customer_id,
      customerAuthorized.id,
    );
  }
}
