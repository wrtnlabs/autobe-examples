import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validates the creation of a unique shopping cart for an authenticated
 * customer.
 *
 * This test ensures that after registering a customer, they can initialize a
 * shopping cart. It checks the unique association of the cart to the customer
 * and enforces the business rule that a customer can only own one active cart
 * at a time (subsequent creation attempts should fail).
 *
 * Step-by-step process:
 *
 * 1. Register a new customer (random credentials, all field constraints observed).
 * 2. Authenticate customer session via join (api.functional.auth.customer.join).
 * 3. Create cart (api.functional.shoppingMall.customer.carts.create).
 * 4. Validate cart association to customer and that timestamps and structure are
 *    present.
 * 5. Attempt to create another cart as the same customer (must throw error:
 *    one-cart-per-customer enforcement).
 */
export async function test_api_cart_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerBody });
  typia.assert(customerAuth);

  // Check that the registered values match
  TestValidator.equals(
    "registered email matches input",
    customerAuth.email,
    customerBody.email,
  );
  TestValidator.equals(
    "registered name matches input",
    customerAuth.name,
    customerBody.name,
  );
  TestValidator.equals(
    "registered phone matches input",
    customerAuth.phone,
    customerBody.phone,
  );

  // 2. Create cart for the customer
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {} satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // Validate cart structure and business association
  TestValidator.equals(
    "cart customer id matches registered customer",
    cart.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "cart customer name matches registered customer",
    cart.customer.name,
    customerAuth.name,
  );
  TestValidator.predicate(
    "cart id is non-empty string",
    typeof cart.id === "string" && cart.id.length > 0,
  );
  TestValidator.predicate(
    "cart created_at is ISO date-time",
    typeof cart.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        cart.created_at,
      ),
  );
  TestValidator.predicate(
    "cart updated_at is ISO date-time",
    typeof cart.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
        cart.updated_at,
      ),
  );

  // 3. Attempt to create another cart for this customer (should fail)
  await TestValidator.error(
    "creating second cart for same customer should fail",
    async () => {
      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: {} satisfies IShoppingMallCart.ICreate,
      });
    },
  );
}
