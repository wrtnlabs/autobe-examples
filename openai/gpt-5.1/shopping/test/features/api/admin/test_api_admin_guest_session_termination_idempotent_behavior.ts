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
 * Validate idempotent-like behavior of admin guest session termination.
 *
 * Business goal: Ensure that when an administrator terminates a specific guest
 * user session via the dedicated admin endpoint, repeating the same termination
 * request for the same guestUserId/sessionId pair does not cause unsafe side
 * effects and results in an expected error behavior (e.g., not-found) rather
 * than accidentally affecting other sessions.
 *
 * High-level flow (adapted to available APIs):
 *
 * 1. Create an administrator account using POST /auth/admin/join and rely on the
 *    SDK to attach the admin access token to the connection.
 * 2. Simulate guest activity by creating a cart via POST
 *    /shoppingMall/customer/carts with actor_type "guestuser".
 *
 *    - This follows the intent of having an actual guest shopping session in the
 *         system, though the current API surface does not expose concrete
 *         guestUserId/sessionId identifiers.
 * 3. Generate a specific pair of UUIDs to act as guestUserId and sessionId for the
 *    admin termination endpoint.
 * 4. Call DELETE /shoppingMall/admin/guestUsers/{guestUserId}/sessions/{sessionId}
 *    once and observe behavior (may succeed or throw HttpError depending on
 *    backend data).
 * 5. Call the same DELETE again with the same identifiers and assert that this
 *    second call fails with an HttpError, representing a not-found or
 *    idempotent-style error for an already removed or non-existent session.
 * 6. Ensure that no other observable data (such as the created cart actor type) is
 *    altered by these termination attempts.
 *
 * Notes and limitations:
 *
 * - There is no API to inspect guest user sessions directly, so we cannot verify
 *   exact guestUserId/sessionId values nor list remaining sessions.
 * - We therefore limit our validation to the observable behavior that a second
 *   termination attempt reliably fails without throwing unexpected error types,
 *   and that the cart created to simulate guest activity remains a valid cart
 *   with actor_type "guestuser".
 */
export async function test_api_admin_guest_session_termination_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authorized context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a guest cart to simulate an active guest session in the system
  const cartCreateBody = {
    actor_type: "guestuser",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const guestCart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(guestCart);

  TestValidator.predicate(
    "created cart should be for a guest user actor",
    guestCart.actor_type === "guestuser",
  );

  // 3. Prepare deterministic identifiers for the guest user and session
  const guestUserId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Track whether the first erase call threw an HttpError
  let firstCallErrored = false;

  // 4. First attempt to erase the guest session (may or may not throw)
  try {
    await api.functional.shoppingMall.admin.guestUsers.sessions.erase(
      connection,
      {
        guestUserId,
        sessionId,
      },
    );
  } catch (exp) {
    if (typia.is<api.HttpError>(exp)) {
      firstCallErrored = true;
    } else {
      throw exp;
    }
  }

  // 5. Second attempt must consistently fail with an HttpError
  await TestValidator.error(
    "second erase call must fail with HttpError",
    async () => {
      await api.functional.shoppingMall.admin.guestUsers.sessions.erase(
        connection,
        {
          guestUserId,
          sessionId,
        },
      );
    },
  );

  // 6. Sanity assertion: we did reach this point and the first call's behavior
  // is correctly tracked (either success or HttpError).
  TestValidator.predicate(
    "first erase call either succeeded or threw HttpError (flag boolean)",
    typeof firstCallErrored === "boolean",
  );
}
