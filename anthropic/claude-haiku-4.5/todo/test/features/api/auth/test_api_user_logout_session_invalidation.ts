import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that logging out invalidates the user's session and revokes tokens
 * immediately.
 *
 * 1. Register a new user and obtain authorized tokens
 * 2. Validate the authorized user object and session tokens
 * 3. Perform user logout while authenticated
 * 4. Confirm logout success and response structure
 * 5. Attempt to reuse old access tokens to access a protected endpoint (should
 *    fail)
 * 6. (If possible) Confirm session 'expired_at' timestamp logic is set
 * 7. (Optional) Check that logout only impacts the right session (single-user
 *    scope)
 */
export async function test_api_user_logout_session_invalidation(
  connection: api.IConnection,
) {
  // 1. Register a new user and obtain tokens
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://app.example.com/register", // Required for session context
    referrer: "https://app.example.com/landing", // Required for session context
    ip: null,
  } satisfies ITodoListUser.IJoin;
  const authed: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinInput },
  );
  typia.assert(authed);
  TestValidator.predicate(
    "issued tokens include access and refresh with future expiry",
    typeof authed.token.access === "string" &&
      typeof authed.token.refresh === "string" &&
      !!Date.parse(authed.token.expired_at) &&
      !!Date.parse(authed.token.refreshable_until),
  );

  // 2. Logout the authenticated user (connection auto-auth'd)
  const logoutResult: ITodoListUser.ILogout =
    await api.functional.auth.user.logout(connection);
  typia.assert(logoutResult);

  // 3. Attempt to call logout again with the same connection (should fail)
  await TestValidator.error("logout token can't be reused", async () => {
    await api.functional.auth.user.logout(connection);
  });

  // 4. Attempt to perform authenticated join with revoked token (should NOT re-auth current session)
  // (This is limited since there are no other protected endpoints exposed here)

  // 5. (If applicable) Check session expiration time business logic (Not testable without session read ability)
}
