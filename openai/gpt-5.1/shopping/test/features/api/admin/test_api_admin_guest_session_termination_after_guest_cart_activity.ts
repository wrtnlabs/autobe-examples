import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";

/**
 * Validate admin ability to invoke guest session termination after guest cart
 * activity.
 *
 * Business intent (adapted to available APIs):
 *
 * - Ensure that an administrator, authenticated through the admin auth endpoints,
 *   can successfully call the guest session termination endpoint using
 *   realistic guest-related identifiers derived from a cart created as a
 *   guestuser cart.
 * - Since we have no public read/list APIs for guest sessions or guest users, the
 *   test focuses on happy-path invocation and basic invariants observable from
 *   available DTOs, not on verifying actual persistence of session rows.
 *
 * End-to-end flow implemented:
 *
 * 1. Admin bootstrap
 *
 *    - Call POST /auth/admin/join with random but valid credentials.
 *    - SDK automatically stores the access token into
 *         connection.headers.Authorization.
 * 2. Guest cart creation
 *
 *    - Call POST /shoppingMall/customer/carts with a body that creates a cart for a
 *         guest actor (actor_type = "guestuser").
 *    - Assert that the returned IShoppingMallCart is structurally valid via
 *         typia.assert.
 *    - Optionally assert that actor_type is exactly "guestuser" as we requested.
 *    - If owner_guestuser is present, capture its id as a realistic guestUserId
 *         associated with this cart; otherwise fall back to a random UUID.
 * 3. Ensure admin context for termination
 *
 *    - Because join already authenticated the admin and set Authorization header,
 *         the connection remains admin-authenticated.
 *    - To simulate a fresh admin login scenario (and to ensure the headers are
 *         correctly managed by the SDK), we explicitly call POST
 *         /auth/admin/login with the same credentials. This guarantees that
 *         subsequent admin-only calls use a valid admin token.
 * 4. Guest session termination call
 *
 *    - Generate a random UUID as sessionId, because no API exposes real
 *         shopping_mall_guestuser_sessions identifiers.
 *    - Call DELETE /shoppingMall/admin/guestUsers/{guestUserId}/sessions/{sessionId}
 *         using api.functional.shoppingMall.admin.guestUsers.sessions.erase,
 *         passing:
 *
 *         - GuestUserId: owner_guestuser.id if present, otherwise a random UUID
 *         - SessionId: random UUID
 *    - The function returns void, so there is no body to assert. Successful
 *         completion of the Promise without client-side error indicates that
 *         the endpoint contract is satisfied at the SDK level.
 * 5. Business assertions (limited by available read APIs)
 *
 *    - Validate that the created cart’s actor_type is "guestuser" so that the
 *         scenario indeed exercised guest cart creation.
 *    - When owner_guestuser is defined, validate that its id is a UUID string.
 *
 * Limitations:
 *
 * - We cannot truly verify that a concrete shopping_mall_guestuser_sessions row
 *   was created for the cart nor that it was deleted; no session listing/read
 *   APIs are available in this context.
 * - Therefore, steps describing post-deletion lookups or repository-level checks
 *   from the original scenario draft are intentionally omitted to keep the test
 *   implementable and compilable.
 */
export async function test_api_admin_guest_session_termination_after_guest_cart_activity(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap via join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: undefined,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Guest cart creation (actor_type = "guestuser")
  const cartCreateBody = {
    actor_type: "guestuser",
    status: undefined,
    currency_code: undefined,
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // Basic business sanity checks on the cart
  TestValidator.equals(
    "cart actor_type should be guestuser",
    cart.actor_type,
    "guestuser",
  );

  // Capture guestUserId if owner_guestuser is present; otherwise use random UUID
  const guestUserId: string & tags.Format<"uuid"> =
    cart.owner_guestuser?.id ?? typia.random<string & tags.Format<"uuid">>();

  if (cart.owner_guestuser !== null && cart.owner_guestuser !== undefined) {
    // Validate shape of owner_guestuser when provided
    typia.assert<IShoppingMallCartOwnerGuestUserSummary>(cart.owner_guestuser);
    TestValidator.equals(
      "owner_guestuser.id matches guestUserId used for termination",
      cart.owner_guestuser.id,
      guestUserId,
    );
  }

  // 3. Ensure admin context via explicit login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: undefined,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Guest session termination call with realistic IDs
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.shoppingMall.admin.guestUsers.sessions.erase(
    connection,
    {
      guestUserId,
      sessionId,
    },
  );

  // No response body to assert; reaching here without error is success for this test.
}
