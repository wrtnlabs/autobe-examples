import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Validate guest cart creation for a brand new guest user.
 *
 * Business story
 *
 * - An anonymous visitor starts a shopping session.
 * - The front-end first establishes a logical guest identity using the guestUser
 *   join endpoint.
 * - With the issued JWT access token, the visitor then creates a new cart in the
 *   shopping mall domain specifically as a guest user.
 * - The created cart should be empty but fully initialized and correctly tied to
 *   the guest identity.
 *
 * Test steps
 *
 * 1. Call POST /auth/guestUser/join
 *
 *    - Build a minimal IShoppingMallGuestUser.IJoin payload.
 *    - Verify the response is a valid IShoppingMallGuestUser.IAuthorized.
 *    - Confirm that critical identity fields (id and token) are present.
 * 2. Call POST /shoppingMall/guestUser/carts
 *
 *    - Immediately after join, call
 *         api.functional.shoppingMall.guestUser.carts.create.
 *    - Use a minimal valid IShoppingMallCart.ICreate request body:
 *
 *         - Actor_type: "guestuser" (exact business value for guest carts)
 *         - Optionally supply a specific currency_code (e.g., "USD").
 *         - Optionally set status to "active".
 * 3. Validate IShoppingMallCart response
 *
 *    - Use typia.assert(output) to ensure shape and formats are correct.
 *    - Assert business expectations with TestValidator:
 *
 *         - Actor_type is exactly "guestuser".
 *         - Status equals the requested value when supplied.
 *         - Currency_code equals the requested value when supplied.
 *         - Id is a non-empty UUID string.
 *         - Created_at and updated_at are populated.
 *         - Deleted_at is null or undefined.
 *         - Owner_guestuser, when present, reflects the joined guest identity.
 *         - Owner_customer is null or undefined for a pure guest cart.
 *         - Items_snapshot is undefined or an empty array for a brand-new cart with no
 *                   items.
 *         - Estimated_total_amount is either 0 or undefined for an empty cart.
 */
export async function test_api_guest_cart_creation_for_new_guest_user(
  connection: api.IConnection,
) {
  // 1. Establish a new guest user identity via join
  const joinBody = {
    // external_reference is optional; provide a random token-like string
    external_reference: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallGuestUser.IJoin;

  const guestAuthorized: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(guestAuthorized);

  // Basic identity and token sanity checks
  TestValidator.predicate(
    "guest user id must be non-empty UUID string",
    () => guestAuthorized.id.length > 0,
  );
  TestValidator.predicate(
    "guest user token.access must be non-empty",
    () => guestAuthorized.token.access.length > 0,
  );

  // 2. Create a new guest cart using the authenticated context
  const requestedStatus = "active";
  const requestedCurrency = "USD";

  const cartCreateBody = {
    actor_type: "guestuser",
    status: requestedStatus,
    currency_code: requestedCurrency,
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.guestUser.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 3. Business validations on the newly created cart

  // Identity and basic fields
  TestValidator.predicate(
    "cart id must be non-empty UUID string",
    () => cart.id.length > 0,
  );

  TestValidator.equals(
    "cart actor_type must be 'guestuser'",
    cart.actor_type,
    "guestuser",
  );

  // Status and currency behavior: should echo our request when provided
  TestValidator.equals(
    "cart status should equal requestedStatus when provided",
    cart.status,
    requestedStatus,
  );

  TestValidator.equals(
    "cart currency_code should equal requestedCurrency when provided",
    cart.currency_code,
    requestedCurrency,
  );

  // Timestamp expectations
  TestValidator.predicate(
    "cart created_at must be non-empty",
    () => cart.created_at.length > 0,
  );
  TestValidator.predicate(
    "cart updated_at must be non-empty",
    () => cart.updated_at.length > 0,
  );

  // Fresh carts should not be soft-deleted
  TestValidator.predicate(
    "cart deleted_at should be null or undefined for new carts",
    () => cart.deleted_at === null || cart.deleted_at === undefined,
  );

  // For a guest cart, customer owner should be absent
  TestValidator.predicate(
    "owner_customer should be null or undefined for guest carts",
    () => cart.owner_customer === null || cart.owner_customer === undefined,
  );

  // When owner_guestuser is present, its id should match the joined guest id
  if (cart.owner_guestuser !== null && cart.owner_guestuser !== undefined) {
    TestValidator.equals(
      "owner_guestuser.id should equal joined guest user id",
      cart.owner_guestuser.id,
      guestAuthorized.id,
    );
  }

  // Newly created cart should be empty or have no snapshot yet
  if (cart.items_snapshot !== undefined) {
    TestValidator.equals(
      "items_snapshot should be empty array for brand-new cart",
      cart.items_snapshot.length,
      0,
    );
  }

  // Estimated total for an empty cart is either 0 or undefined
  if (cart.estimated_total_amount !== undefined) {
    TestValidator.equals(
      "estimated_total_amount should be 0 for empty cart when present",
      cart.estimated_total_amount,
      0,
    );
  }
}
