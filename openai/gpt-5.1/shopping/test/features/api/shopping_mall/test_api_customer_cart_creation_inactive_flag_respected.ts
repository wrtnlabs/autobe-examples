import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * Validate customer cart creation when explicitly setting is_active to false.
 *
 * Business goal
 *
 * - Ensure that when a customer creates a cart with is_active explicitly set to
 *   false, the backend persists that inactive state instead of silently
 *   treating the cart as active.
 * - Additionally, confirm that creating another cart without specifying is_active
 *   still succeeds and that both carts are correctly associated with the
 *   authenticated customer.
 *
 * High-level flow
 *
 * 1. Register and authenticate a new customer via POST /auth/customer/join.
 * 2. Create a first cart with IShoppingMallCustomerCart.ICreate where is_active is
 *    explicitly false and currency_code/region_code are provided.
 * 3. Verify that the returned cart has is_active === false and belongs to the
 *    authenticated customer.
 * 4. Create a second cart omitting is_active, and verify it is created for the
 *    same customer with the requested configuration.
 * 5. Compare both carts to ensure they have distinct identifiers and are logically
 *    independent cart records.
 */
export async function test_api_customer_cart_creation_inactive_flag_respected(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    // ip is optional and can be omitted; href and referrer are required.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create first cart with is_active explicitly set to false.
  const currencyCode1 = "USD";
  const regionCode1 = "US";

  const createBodyInactive = {
    currency_code: currencyCode1,
    region_code: regionCode1,
    is_active: false,
    channel: "web",
    metadata: {
      scenario: "inactive_cart_test",
      note: "explicit_is_active_false",
    },
  } satisfies IShoppingMallCustomerCart.ICreate;

  const inactiveCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createBodyInactive,
      },
    );
  typia.assert(inactiveCart);

  // Validate that the first cart reflects the explicit inactive flag.
  TestValidator.equals(
    "first cart should persist explicit is_active=false",
    inactiveCart.is_active,
    false,
  );

  // Validate that the cart belongs to the authenticated customer.
  TestValidator.equals(
    "inactive cart must belong to joined customer",
    inactiveCart.customer.id,
    authorized.customer.id,
  );

  TestValidator.equals(
    "inactive cart currency code should match request",
    inactiveCart.currency_code,
    currencyCode1,
  );

  TestValidator.equals(
    "inactive cart region code should match request",
    inactiveCart.region_code,
    regionCode1,
  );

  TestValidator.predicate(
    "inactive cart status should be a non-empty string",
    typeof inactiveCart.status === "string" && inactiveCart.status.length > 0,
  );

  // 3. Create a second cart with default is_active (omitted).
  const currencyCode2 = "EUR";
  const regionCode2 = "EU";

  const createBodyDefault = {
    currency_code: currencyCode2,
    region_code: regionCode2,
    channel: "web",
    metadata: {
      scenario: "inactive_cart_test",
      note: "default_is_active_omitted",
    },
  } satisfies IShoppingMallCustomerCart.ICreate;

  const defaultCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createBodyDefault,
      },
    );
  typia.assert(defaultCart);

  // Validate association and basic configuration of the second cart.
  TestValidator.equals(
    "second cart must belong to the same customer",
    defaultCart.customer.id,
    authorized.customer.id,
  );

  TestValidator.equals(
    "second cart currency code should match request",
    defaultCart.currency_code,
    currencyCode2,
  );

  TestValidator.equals(
    "second cart region code should match request",
    defaultCart.region_code,
    regionCode2,
  );

  TestValidator.predicate(
    "second cart status should be a non-empty string",
    typeof defaultCart.status === "string" && defaultCart.status.length > 0,
  );

  // 4. Compare the two carts to ensure they are distinct records.
  TestValidator.notEquals(
    "two carts created for the same customer should have different ids",
    inactiveCart.id,
    defaultCart.id,
  );

  // Ensure again that the explicit inactive cart is not marked active.
  TestValidator.predicate(
    "explicit inactive cart should not be marked active",
    inactiveCart.is_active === false,
  );
}
