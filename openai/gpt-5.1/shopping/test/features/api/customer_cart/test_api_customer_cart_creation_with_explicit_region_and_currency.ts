import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * Validate explicit region and currency configuration on customer cart
 * creation.
 *
 * Business goal:
 *
 * - Ensure that an authenticated customer can explicitly choose `region_code` and
 *   `currency_code` when creating a cart.
 * - Ensure that these configuration fields are honored and persisted
 *   independently for multiple carts owned by the same customer.
 *
 * Scenario steps:
 *
 * 1. Register (join) a new customer using POST /auth/customer/join and rely on the
 *    SDK to attach the Authorization header for subsequent calls.
 * 2. Create a first cart via POST /shoppingMall/customer/customerCarts with an
 *    explicit `currency_code` (e.g., "USD") and `region_code` (e.g.,
 *    "US-East"), plus optional `channel`, `metadata`, `is_active`, and
 *    `source_guest_token`.
 * 3. Assert that the first cart:
 *
 *    - Has `currency_code` and `region_code` matching the request.
 *    - Has `is_active` equal to the specified value (true in this test).
 *    - Exposes non-negative numeric totals for `subtotal_amount`, `discount_amount`,
 *         `tax_amount`, `shipping_amount`, and `total_amount`.
 * 4. Create a second cart with a different configuration (e.g., `currency_code`
 *    "EUR" and `region_code` "EU-West"), different `channel` and `metadata`,
 *    and `is_active` set to false.
 * 5. Assert that the second cart:
 *
 *    - Has its own `currency_code`/`region_code` matching the second request.
 *    - Has `is_active` reflecting the requested false value.
 * 6. Cross-assert between the two carts that:
 *
 *    - They have different `id` values.
 *    - Both are associated with the same `customer.id` in their summary.
 *    - Their configuration fields do not interfere with each other (first cart keeps
 *         its original region/currency; second cart keeps its own).
 * 7. Throughout, use `typia.assert` to validate response DTOs structurally, and
 *    `TestValidator` predicates/equality checks for business-level
 *    expectations.
 */
export async function test_api_customer_cart_creation_with_explicit_region_and_currency(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer via /auth/customer/join
  const joinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Passw0rd!",
    name: RandomGenerator.name(),
    // optional ip omitted to let backend infer from context
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized);

  // 2. Create the first cart with explicit region/currency and active=true
  const firstCreateBody = {
    currency_code: "USD",
    region_code: "US-East",
    channel: "web",
    metadata: {
      experiment: "cart-region-currency-A",
      cohort: "A1",
    },
    is_active: true,
    source_guest_token: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerCart.ICreate;

  const firstCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(firstCart);

  // 3. Validate first cart configuration and totals
  TestValidator.equals(
    "first cart currency_code should match request",
    firstCart.currency_code,
    firstCreateBody.currency_code,
  );
  TestValidator.equals(
    "first cart region_code should match request",
    firstCart.region_code,
    firstCreateBody.region_code,
  );
  TestValidator.equals(
    "first cart is_active should match requested true",
    firstCart.is_active,
    firstCreateBody.is_active,
  );

  TestValidator.predicate(
    "first cart subtotal_amount should be non-negative",
    firstCart.subtotal_amount >= 0,
  );
  TestValidator.predicate(
    "first cart discount_amount should be non-negative",
    firstCart.discount_amount >= 0,
  );
  TestValidator.predicate(
    "first cart tax_amount should be non-negative",
    firstCart.tax_amount >= 0,
  );
  TestValidator.predicate(
    "first cart shipping_amount should be non-negative",
    firstCart.shipping_amount >= 0,
  );
  TestValidator.predicate(
    "first cart total_amount should be non-negative",
    firstCart.total_amount >= 0,
  );

  // 4. Create a second cart with different configuration and inactive state
  const secondCreateBody = {
    currency_code: "EUR",
    region_code: "EU-West",
    channel: "mobile_web",
    metadata: {
      experiment: "cart-region-currency-B",
      cohort: "B1",
    },
    is_active: false,
    source_guest_token: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerCart.ICreate;

  const secondCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: secondCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(secondCart);

  // 5. Validate second cart configuration and totals
  TestValidator.equals(
    "second cart currency_code should match request",
    secondCart.currency_code,
    secondCreateBody.currency_code,
  );
  TestValidator.equals(
    "second cart region_code should match request",
    secondCart.region_code,
    secondCreateBody.region_code,
  );
  TestValidator.equals(
    "second cart is_active should match requested false",
    secondCart.is_active,
    secondCreateBody.is_active,
  );

  TestValidator.predicate(
    "second cart subtotal_amount should be non-negative",
    secondCart.subtotal_amount >= 0,
  );
  TestValidator.predicate(
    "second cart discount_amount should be non-negative",
    secondCart.discount_amount >= 0,
  );
  TestValidator.predicate(
    "second cart tax_amount should be non-negative",
    secondCart.tax_amount >= 0,
  );
  TestValidator.predicate(
    "second cart shipping_amount should be non-negative",
    secondCart.shipping_amount >= 0,
  );
  TestValidator.predicate(
    "second cart total_amount should be non-negative",
    secondCart.total_amount >= 0,
  );

  // 6. Cross-cart assertions: independence and same customer ownership
  TestValidator.notEquals(
    "first and second carts should have different ids",
    firstCart.id,
    secondCart.id,
  );

  TestValidator.equals(
    "both carts should belong to the same customer (summary.id equal join result id)",
    firstCart.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "second cart customer.id should match join result id",
    secondCart.customer.id,
    authorized.id,
  );

  TestValidator.equals(
    "first cart region_code should remain US-East",
    firstCart.region_code,
    firstCreateBody.region_code,
  );
  TestValidator.equals(
    "second cart region_code should remain EU-West",
    secondCart.region_code,
    secondCreateBody.region_code,
  );

  TestValidator.equals(
    "first cart currency_code should remain USD",
    firstCart.currency_code,
    firstCreateBody.currency_code,
  );
  TestValidator.equals(
    "second cart currency_code should remain EUR",
    secondCart.currency_code,
    secondCreateBody.currency_code,
  );
}
