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
 * Validate that a newly registered customer can create an initial cart and that
 * the created cart header correctly reflects customer ownership and an empty
 * item state.
 *
 * Business context:
 *
 * - Customer accounts are registered through /auth/customer/join and immediately
 *   receive an authenticated session via the returned
 *   IShoppingMallCustomer.IAuthorized payload, whose token.access is
 *   automatically bound to the shared connection by the SDK.
 * - Customer-facing cart creation is done via /shoppingMall/customer/carts and
 *   accepts an IShoppingMallCart.ICreate request body that determines the actor
 *   type (customer vs guestuser), optional status, and optional currency code.
 * - For a fresh customer cart, we expect the actor_type to be "customer", the
 *   owner_customer summary to reference the new customer, the cart to be in an
 *   initial active-like status with no soft deletion, and no items or monetary
 *   total yet.
 *
 * Scenario steps:
 *
 * 1. Register a new customer using auth.customer.join with a realistic
 *    IShoppingMallCustomerJoin.IRequest body (email, password, href, referrer,
 *    and optional ip).
 * 2. Using the same connection (now carrying the customer Authorization header),
 *    call shoppingMall.customer.carts.create with an IShoppingMallCart.ICreate
 *    body where actor_type = "customer" and currency_code is either omitted or
 *    set to a valid ISO currency string.
 * 3. Assert that the returned IShoppingMallCart:
 *
 *    - Has a valid UUID id.
 *    - Has actor_type === "customer".
 *    - Has owner_customer populated; its id equals the authorized customer's id from
 *         the join response and display_name is a non-empty string.
 *    - Has owner_guestuser either null or undefined.
 *    - Has a non-empty status string and deleted_at is null or undefined.
 *    - Has items_snapshot either undefined or an empty array.
 *    - Has estimated_total_amount either 0 or undefined/null, representing an empty
 *         cart.
 * 4. Negative policy scenario (optional from business draft): attempt to create a
 *    cart with actor_type = "guestuser" while authenticated as a customer and
 *    confirm that the API rejects this combination, using TestValidator.error.
 *    This validates that the service layer enforces consistency between the
 *    actor_type and the authenticated context.
 */
export async function test_api_customer_cart_creation_after_registration(
  connection: api.IConnection,
) {
  // 1. Register a new customer via auth.customer.join
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create a customer-owned cart via shoppingMall.customer.carts.create
  const createCartBody = {
    actor_type: "customer",
    // let backend choose default status; currency_code can be omitted or
    // explicitly specified. Here we explicitly set a common ISO currency.
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: createCartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 3. Business assertions about the created cart

  // Ownership and actor type
  TestValidator.equals(
    "cart actor_type must be 'customer'",
    cart.actor_type,
    "customer",
  );

  // owner_customer must exist and correspond to the joined customer
  TestValidator.predicate(
    "owner_customer should be defined for a customer cart",
    cart.owner_customer !== null && cart.owner_customer !== undefined,
  );

  if (cart.owner_customer !== null && cart.owner_customer !== undefined) {
    TestValidator.equals(
      "owner_customer.id should match customer.id",
      cart.owner_customer.id,
      customer.id,
    );
    TestValidator.predicate(
      "owner_customer.display_name should be non-empty",
      cart.owner_customer.display_name.length > 0,
    );
  }

  // owner_guestuser should not be set for a customer cart
  TestValidator.predicate(
    "owner_guestuser should be null or undefined for a customer cart",
    cart.owner_guestuser === null || cart.owner_guestuser === undefined,
  );

  // Status is a non-empty string
  TestValidator.predicate(
    "cart.status should be a non-empty string",
    typeof cart.status === "string" && cart.status.length > 0,
  );

  // deleted_at is null or undefined for a fresh cart
  TestValidator.predicate(
    "deleted_at should be null or undefined for a new cart",
    cart.deleted_at === null || cart.deleted_at === undefined,
  );

  // items_snapshot should be undefined or empty (no items added yet)
  TestValidator.predicate(
    "items_snapshot should be undefined or an empty array for a new cart",
    cart.items_snapshot === undefined || cart.items_snapshot.length === 0,
  );

  // estimated_total_amount should be 0 or undefined/null for an empty cart
  TestValidator.predicate(
    "estimated_total_amount should be 0, null, or undefined for an empty cart",
    cart.estimated_total_amount === undefined ||
      cart.estimated_total_amount === null ||
      cart.estimated_total_amount === 0,
  );

  // 4. Negative scenario: creating a guestuser cart while authenticated
  await TestValidator.error(
    "creating a guestuser cart while authenticated as customer should fail (if enforced)",
    async () => {
      const guestCartBody = {
        actor_type: "guestuser",
        currency_code: "USD",
      } satisfies IShoppingMallCart.ICreate;

      await api.functional.shoppingMall.customer.carts.create(connection, {
        body: guestCartBody,
      });
    },
  );
}
