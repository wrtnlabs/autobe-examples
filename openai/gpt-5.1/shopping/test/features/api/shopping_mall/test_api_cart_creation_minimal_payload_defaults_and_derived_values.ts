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
 * Verify minimal customer cart creation defaults and derived values.
 *
 * Business purpose:
 *
 * - Ensure a newly joined customer can create a cart with the smallest valid
 *   payload (only actor_type="customer") and rely on the backend to populate
 *   all server-managed fields and defaults.
 * - Confirm that ownership, status, currency, timestamps, and derived summaries
 *   are initialized consistently for an empty cart.
 *
 * Steps:
 *
 * 1. Register (join) a new customer via POST /auth/customer/join, obtaining an
 *    authenticated session.
 * 2. Create a cart via POST /shoppingMall/customer/carts using minimal
 *    IShoppingMallCart.ICreate body: { actor_type: "customer" }.
 * 3. Assert identity fields (id, actor_type) and defaulted business fields
 *    (status, currency_code).
 * 4. Assert timestamps: created_at <= updated_at, deleted_at and last_validated_at
 *    are null/undefined.
 * 5. Assert ownership projection: owner_customer matches the joined customer's id,
 *    owner_guestuser is null/undefined.
 * 6. Assert empty cart content: items_snapshot undefined or empty, and
 *    estimated_total_amount undefined or 0.
 */
export async function test_api_cart_creation_minimal_payload_defaults_and_derived_values(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const joinBody = {
    ...typia.random<IShoppingMallCustomerJoin.IRequest>(),
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Create a cart with minimal payload (only actor_type)
  const createBody = {
    actor_type: "customer",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 3. Core identity and actor fields
  TestValidator.equals(
    "cart actor_type should be 'customer'",
    cart.actor_type,
    "customer",
  );

  TestValidator.predicate(
    "cart id should be a non-empty string",
    cart.id.length > 0,
  );

  // status should be non-empty; do not assume concrete business default value
  TestValidator.predicate(
    "cart status should be non-empty",
    cart.status.length > 0,
  );

  // currency_code should be non-empty default/platform currency
  TestValidator.predicate(
    "cart currency_code should be non-empty",
    cart.currency_code.length > 0,
  );

  // 4. Timestamps and lifecycle fields
  const createdAtMillis = new Date(cart.created_at).getTime();
  const updatedAtMillis = new Date(cart.updated_at).getTime();

  TestValidator.predicate(
    "cart created_at should be a valid date",
    !Number.isNaN(createdAtMillis),
  );
  TestValidator.predicate(
    "cart updated_at should be a valid date",
    !Number.isNaN(updatedAtMillis),
  );
  TestValidator.predicate(
    "cart created_at should be earlier than or equal to updated_at",
    createdAtMillis <= updatedAtMillis,
  );

  TestValidator.predicate(
    "new cart deleted_at should be null or undefined",
    cart.deleted_at === null || cart.deleted_at === undefined,
  );

  TestValidator.predicate(
    "new cart last_validated_at should be null or undefined",
    cart.last_validated_at === null || cart.last_validated_at === undefined,
  );

  // 5. Ownership / summary fields
  TestValidator.predicate(
    "customer cart should have owner_customer populated",
    cart.owner_customer !== null && cart.owner_customer !== undefined,
  );

  if (cart.owner_customer !== null && cart.owner_customer !== undefined) {
    TestValidator.equals(
      "cart owner_customer.id should match authenticated customer id",
      cart.owner_customer.id,
      customer.id,
    );
  }

  TestValidator.predicate(
    "customer cart should not have owner_guestuser populated",
    cart.owner_guestuser === null || cart.owner_guestuser === undefined,
  );

  // Sanity check: actor_type and ownership alignment
  TestValidator.predicate(
    "actor_type 'customer' must align with presence of owner_customer and absence of owner_guestuser",
    cart.actor_type === "customer" &&
      cart.owner_customer !== null &&
      cart.owner_customer !== undefined &&
      (cart.owner_guestuser === null || cart.owner_guestuser === undefined),
  );

  // 6. Empty cart content and derived totals
  if (cart.items_snapshot !== undefined) {
    TestValidator.equals(
      "newly created cart should have no items in items_snapshot",
      cart.items_snapshot.length,
      0,
    );
  }

  if (cart.estimated_total_amount !== undefined) {
    TestValidator.equals(
      "estimated_total_amount for empty cart should be zero",
      cart.estimated_total_amount,
      0,
    );
  }
}
