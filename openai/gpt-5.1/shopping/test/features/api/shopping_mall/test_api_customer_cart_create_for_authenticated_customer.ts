import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate creation of a customer-owned cart for an authenticated customer.
 *
 * Business intent:
 *
 * - Ensure that a newly registered customer can immediately create a cart through
 *   the customer-scoped cart creation endpoint.
 * - Verify that the created cart header is owned by the authenticated customer
 *   (not a guest), that actor_type and currency_code reflect the request and
 *   business defaults, and that a fresh cart starts empty with zero (or
 *   undefined) estimated total.
 *
 * Steps:
 *
 * 1. Register (join) a new customer using /auth/customer/join with realistic
 *    credentials and context URLs.
 * 2. Using the same connection (now bearing the customer token), call
 *    /shoppingMall/customer/carts with an IShoppingMallCart.ICreate body
 *    setting actor_type to "customer" and a specific currency_code such as
 *    "USD", leaving status undefined to exercise backend defaults.
 * 3. Assert that the resulting IShoppingMallCart:
 *
 *    - Has a valid UUID id and non-empty status string,
 *    - Has actor_type exactly "customer",
 *    - Has currency_code equal to the requested value,
 *    - Links owner_customer.id to the joined customer.id and has owner_guestuser
 *         null/undefined,
 *    - Has either no items_snapshot field or an empty array,
 *    - Has estimated_total_amount either undefined or exactly 0.
 */
export async function test_api_customer_cart_create_for_authenticated_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) to obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create a new customer cart with minimal required fields
  const currencyCode = "USD";
  const createCartBody = {
    actor_type: "customer",
    currency_code: currencyCode,
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: createCartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 3. Business assertions on cart header and ownership

  // Actor type should be exactly "customer"
  TestValidator.equals(
    "cart actor_type should be 'customer'",
    cart.actor_type,
    "customer",
  );

  // Status should be a non-empty string (backend default applied)
  TestValidator.predicate(
    "cart status should be a non-empty string",
    () => typeof cart.status === "string" && cart.status.length > 0,
  );

  // Currency code should echo the requested value
  TestValidator.equals(
    "cart currency_code should match requested value",
    cart.currency_code,
    currencyCode,
  );

  // Owner-customer summary must exist and match the authenticated customer id
  TestValidator.predicate(
    "owner_customer should be defined for customer-owned cart",
    () => cart.owner_customer !== null && cart.owner_customer !== undefined,
  );

  if (cart.owner_customer !== null && cart.owner_customer !== undefined) {
    const ownerCustomer: IShoppingMallCartOwnerCustomerSummary =
      cart.owner_customer;
    TestValidator.equals(
      "owner_customer.id should equal authenticated customer id",
      ownerCustomer.id,
      customer.id,
    );
  }

  // Guest user owner summary should not be set for customer-owned cart
  TestValidator.predicate(
    "owner_guestuser should be null or undefined for customer-owned cart",
    () => cart.owner_guestuser === null || cart.owner_guestuser === undefined,
  );

  // A new cart should have no items or an empty items_snapshot array
  if (cart.items_snapshot !== undefined) {
    const items: IShoppingMallCartItemSummary[] = cart.items_snapshot;
    TestValidator.equals(
      "newly created cart should have empty items_snapshot when present",
      items.length,
      0,
    );
  }

  // Estimated total amount should be either undefined or zero for an empty cart
  if (cart.estimated_total_amount !== undefined) {
    TestValidator.equals(
      "estimated_total_amount should be zero for an empty cart when defined",
      cart.estimated_total_amount,
      0,
    );
  }
}
