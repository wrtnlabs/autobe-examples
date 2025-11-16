import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test that an authenticated customer can create a new shopping cart and the
 * one-cart-per-customer rule is enforced.
 *
 * Steps:
 *
 * 1. Register and authenticate a new customer (join).
 * 2. Create a shopping cart as that authenticated customer.
 * 3. Validate cart fields and ownership.
 * 4. Attempt to create a second cart and verify business rule enforcement (should
 *    error).
 */
export async function test_api_customer_cart_creation(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(customer);

  // 2. Create a new cart
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {},
    });
  typia.assert(cart);

  // 3. Validate cart properties and ownership
  TestValidator.predicate(
    "cart id is a valid UUID",
    typeof cart.id === "string" && cart.id.length >= 30,
  );
  TestValidator.equals(
    "cart customer id matches authenticated customer",
    cart.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "cart customer name matches",
    cart.customer.name,
    customer.name,
  );
  TestValidator.predicate(
    "cart created_at is ISO string",
    typeof cart.created_at === "string" && cart.created_at.includes("T"),
  );
  TestValidator.predicate(
    "cart updated_at is ISO string",
    typeof cart.updated_at === "string" && cart.updated_at.includes("T"),
  );

  // 4. Attempt to create a second cart (should fail with business logic error, not type error)
  await TestValidator.error(
    "second cart creation for same customer should fail",
    async () => {
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: {},
      });
    },
  );
}
