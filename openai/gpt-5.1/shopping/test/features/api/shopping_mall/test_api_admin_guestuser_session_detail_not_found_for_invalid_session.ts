import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestuserSession";

/**
 * Verify admin guest user session detail not-found behavior for invalid
 * session.
 *
 * Business goal: Ensure that the administrative endpoint for fetching a
 * specific guest user session, GET
 * /shoppingMall/admin/guestUsers/{guestUserId}/sessions/{sessionId}, does not
 * return a session object when the requested session does not exist, even when
 * the admin is fully authenticated. Instead, the call must fail with an error
 * (typically a not-found style HttpError), and no partial session payload must
 * be exposed.
 *
 * High-level workflow:
 *
 * 1. Register a new admin account via POST /auth/admin/join to obtain a valid
 *    admin authorization context. This ensures that any failure from the
 *    session detail endpoint is due to resource absence, not lack of
 *    authentication.
 * 2. Generate random UUID values for both guestUserId and sessionId. In a clean
 *    test environment, these should not correspond to any real guest user or
 *    session, effectively simulating non-existent resources.
 * 3. Invoke GET /shoppingMall/admin/guestUsers/{guestUserId}/sessions/{sessionId}
 *    using the authenticated admin connection and the random identifiers.
 * 4. Assert that the call results in an error rather than returning an
 *    IShoppingMallGuestuserSession object, using TestValidator.error to
 *    formalize this expectation.
 *
 * Constraints and adaptations:
 *
 * - We do not have an explicit error DTO for not-found responses, and the testing
 *   utilities discourage direct HTTP status code assertions, so we restrict
 *   validation to confirming that an error is thrown and that the success path
 *   is not taken.
 * - We must not deliberately send invalid UUIDs or wrong-typed data; all
 *   identifiers must be syntactically valid UUID strings.
 * - We rely on the SDK’s behavior of throwing HttpError for error HTTP responses;
 *   TestValidator.error will detect that an exception occurred.
 */
export async function test_api_admin_guestuser_session_detail_not_found_for_invalid_session(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain a valid admin authorization context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare syntactically valid but non-existent guestUserId and sessionId
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the session detail endpoint and assert that it fails
  await TestValidator.error(
    "admin guest user session detail should error for non-existent session",
    async () => {
      // If this call unexpectedly succeeds, TestValidator.error will fail
      await api.functional.shoppingMall.admin.guestUsers.sessions.at(
        connection,
        {
          guestUserId,
          sessionId,
        },
      );
    },
  );
}
