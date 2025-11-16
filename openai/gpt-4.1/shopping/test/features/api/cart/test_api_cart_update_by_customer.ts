import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate updating a shopping cart for an authenticated customer.
 *
 * This test exercises the scenario of cart update by its owner. It first
 * registers a unique customer, then creates a cart for that customer. It then
 * updates the cart's 'updated_at' field. Afterwards, it verifies that the
 * update request returns a cart entity with the correct ID, correct customer
 * summary data, and a newer 'updated_at' value. The test ensures only the
 * authenticated owner can update their cart, and future negative cases (other
 * users updating, etc.) could be added.
 *
 * Steps:
 *
 * 1. Register a new customer.
 * 2. Create a cart for the authenticated customer.
 * 3. Prepare an updated_at ISO string newer than the cart's current value.
 * 4. Update the cart (PUT) with the new timestamp.
 * 5. Assert returned cart has same ID, correct owner, and newer updated_at.
 */
export async function test_api_cart_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "customer email must match input",
    authorized.email,
    customerInput.email,
  );
  TestValidator.equals(
    "customer name must match input",
    authorized.name,
    customerInput.name,
  );
  TestValidator.equals(
    "customer phone must match input",
    authorized.phone,
    customerInput.phone,
  );

  // 2. Create a cart for this customer (no fields required in ICreate)
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(cart);
  TestValidator.equals(
    "cart customer id matches authorized user",
    cart.customer.id,
    authorized.id,
  );

  // 3. Prepare a new updated_at timestamp (after the current updated_at)
  // Ensure newUpdatedAt is greater than the previous cart.updated_at
  const currentUpdatedAtMs = Date.parse(cart.updated_at);
  const newUpdatedAt = new Date(currentUpdatedAtMs + 1000).toISOString();

  // 4. Update the cart's updated_at
  const updateBody = {
    updated_at: newUpdatedAt,
  } satisfies IShoppingMallCart.IUpdate;
  const updatedCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.update(connection, {
      cartId: cart.id,
      body: updateBody,
    });
  typia.assert(updatedCart);

  // 5. Assert returned cart has correct values
  TestValidator.equals(
    "cart id remains same after update",
    updatedCart.id,
    cart.id,
  );
  TestValidator.equals(
    "customer id remains unchanged",
    updatedCart.customer.id,
    cart.customer.id,
  );
  TestValidator.predicate(
    "updated_at advances after update",
    Date.parse(updatedCart.updated_at) > Date.parse(cart.updated_at),
  );
}
