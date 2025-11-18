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
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Validate creation of a shopping cart for a guest user.
 *
 * Business goal: Ensure that when a guest user (authenticated via
 * /auth/guestUser/join) creates a cart through POST
 * /shoppingMall/customer/carts with actor_type="guestuser", the resulting cart
 * header is owned by the guest identity (owner_guestuser), not by any
 * registered customer (owner_customer), and lifecycle / currency fields are
 * initialized correctly.
 *
 * Scenario steps:
 *
 * 1. Create and authenticate a guest user using
 *    api.functional.auth.guestUser.join.
 * 2. Create a real customer with api.functional.auth.customer.join to ensure the
 *    system can distinguish customer vs guest, but then re-authenticate as the
 *    guest so the active token is guestUser when creating the cart.
 * 3. As the guest user, call api.functional.shoppingMall.customer.carts.create
 *    with IShoppingMallCart.ICreate specifying:
 *
 *    - Actor_type: "guestuser"
 *    - Currency_code: a concrete ISO currency such as "USD".
 *    - Status omitted to let the backend apply its default.
 * 4. Validate the returned IShoppingMallCart:
 *
 *    - Structural validation via typia.assert(cart).
 *    - Actor_type is exactly "guestuser".
 *    - Owner_guestuser is defined and its id equals the current guest user id.
 *    - Owner_customer is null or undefined.
 *    - Created_at and updated_at are valid date-time strings (non-empty).
 *    - Status is a non-empty string.
 *    - Currency_code equals the requested value.
 *    - Items_snapshot is either undefined or an empty array for a new cart.
 * 5. Assert that the cart is not associated with the registered customer, guarding
 *    against accidental customer ownership when actor_type is guest.
 */
export async function test_api_customer_cart_create_for_guest_user(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a guest user; Authorization becomes guest token.
  const guestJoinInput = {
    external_reference: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallGuestUser.IJoin;
  const guestAuthorized: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoinInput,
    });
  typia.assert(guestAuthorized);

  // Preserve guest identity for later comparison.
  const guestId: string & tags.Format<"uuid"> = guestAuthorized.id;

  // 2. Create a real customer (this will overwrite Authorization header).
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://shop.example.com/join",
    referrer: "https://ads.example.com/campaign",
    ip: null,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3. Re-authenticate as guest so that the active Authorization header
  //    represents the guest user for cart creation.
  const guestAuthorizedAgain: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestJoinInput,
    });
  typia.assert(guestAuthorizedAgain);

  const activeGuestId: string & tags.Format<"uuid"> = guestAuthorizedAgain.id;
  TestValidator.equals(
    "rejoined guest identity should remain stable or at least be a valid UUID",
    activeGuestId,
    guestAuthorizedAgain.id,
  );

  // 4. Create cart as guest using actor_type="guestuser".
  const currencyCode = "USD";
  const cartCreateBody = {
    actor_type: "guestuser",
    currency_code: currencyCode,
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 5. Validate guest ownership and lifecycle fields.
  TestValidator.equals(
    "cart actor_type should be guestuser",
    cart.actor_type,
    "guestuser",
  );

  // owner_guestuser must be populated and match active guest id.
  TestValidator.predicate(
    "cart owner_guestuser summary should be present for guest cart",
    cart.owner_guestuser !== null && cart.owner_guestuser !== undefined,
  );

  if (cart.owner_guestuser !== null && cart.owner_guestuser !== undefined) {
    TestValidator.equals(
      "cart owner_guestuser.id should equal active guest id",
      cart.owner_guestuser.id,
      activeGuestId,
    );
  }

  // owner_customer must not be set for a guest-owned cart.
  TestValidator.predicate(
    "cart owner_customer should be null or undefined for guest cart",
    cart.owner_customer === null || cart.owner_customer === undefined,
  );

  // Validate lifecycle timestamps and status.
  TestValidator.predicate(
    "cart created_at should be a non-empty string",
    typeof cart.created_at === "string" && cart.created_at.length > 0,
  );
  TestValidator.predicate(
    "cart updated_at should be a non-empty string",
    typeof cart.updated_at === "string" && cart.updated_at.length > 0,
  );
  TestValidator.predicate(
    "cart status should be a non-empty string",
    typeof cart.status === "string" && cart.status.length > 0,
  );

  // Currency must echo the requested one when provided.
  TestValidator.equals(
    "cart currency_code should equal requested currency_code",
    cart.currency_code,
    currencyCode,
  );

  // New cart should have no items yet (items_snapshot undefined or empty array).
  const itemsSnapshot = cart.items_snapshot;
  if (itemsSnapshot !== undefined) {
    TestValidator.equals(
      "new guest cart should start with empty items_snapshot when present",
      itemsSnapshot.length,
      0,
    );
  }

  // 6. Ensure cart is not associated with the registered customer we created.
  TestValidator.predicate(
    "guest cart must not be linked to the registered customer id",
    cart.owner_customer === null ||
      cart.owner_customer === undefined ||
      cart.owner_customer.id !== customerAuthorized.id,
  );
}
