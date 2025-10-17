import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test administrator logout workflow including session invalidation and token
 * revocation.
 *
 * This test validates the complete logout process for administrators:
 *
 * 1. Register a new admin account to establish authenticated session
 * 2. Perform logout operation to invalidate current session
 * 3. Verify logout response confirms successful session termination
 * 4. Validate that subsequent API requests with invalidated token are rejected
 * 5. Confirm tokens can no longer be used after logout
 *
 * The logout operation should:
 *
 * - Soft delete the session by setting deleted_at timestamp
 * - Invalidate both access and refresh tokens
 * - Only affect the current session (session-specific invalidation)
 * - Log the logout event in moderation logs for audit trail
 */
export async function test_api_admin_logout_session_termination(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account to establish authenticated session
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A1!",
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Store the original access token for later verification
  const originalAccessToken = admin.token.access;

  // Step 2: Perform logout operation to invalidate current session
  const logoutResponse: IRedditLikeAdmin.ILogoutResponse =
    await api.functional.auth.admin.logout(connection);
  typia.assert(logoutResponse);

  // Step 3: Verify logout response confirms successful session termination
  TestValidator.equals("logout success is true", logoutResponse.success, true);

  // Step 4: Create a connection with the invalidated token to test rejection
  const invalidatedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: originalAccessToken,
    },
  };

  // Step 5: Validate that subsequent API requests with invalidated token are rejected
  await TestValidator.error("logout invalidates access token", async () => {
    await api.functional.auth.admin.logout(invalidatedConnection);
  });
}
