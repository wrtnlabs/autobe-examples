import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that refresh fails when using an invalid refresh token (simulating
 * revoked session).
 *
 * This test validates a critical security requirement: refresh tokens must be
 * validated properly by the backend. Since we don't have access to a logout
 * endpoint or session revocation API, we simulate a revoked/invalid session by
 * attempting to refresh with a token that doesn't correspond to any active
 * session in the database.
 *
 * In a real-world scenario, when an admin logs out or changes their password,
 * the todo_list_admin_sessions table would have its expired_at field set to a
 * non-null value, effectively revoking the session. Any subsequent refresh
 * attempts with that session's refresh token should fail with an authentication
 * error.
 *
 * Test workflow:
 *
 * 1. Create a new admin account through registration
 * 2. Authenticate the admin to establish a valid session
 * 3. Attempt to refresh using an invalid/fake refresh token (simulating a revoked
 *    session)
 * 4. Verify that the refresh operation fails with an authentication error
 * 5. Confirm that no new access token is issued
 *
 * This ensures that only valid, active sessions can use their refresh tokens to
 * obtain new access tokens. Invalid or revoked tokens are properly rejected,
 * forcing the administrator to login again with credentials to establish a new
 * authenticated session.
 */
export async function test_api_admin_refresh_revoked_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdminPass123!";

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/home",
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(registeredAdmin);

  // Step 2: Login to verify the account works and authentication is functional
  const authenticatedAdmin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/home",
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(authenticatedAdmin);

  // Step 3 & 4: Attempt to refresh using an invalid/fake refresh token
  // This simulates what would happen if we tried to use a refresh token from a revoked session
  // In the real scenario, this would be a legitimate token whose session has been revoked
  const fakeRevokedToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  await TestValidator.error(
    "refresh should fail for revoked/invalid admin session token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refreshToken: fakeRevokedToken,
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );

  // The test passes if the refresh operation throws an error, indicating that
  // invalid or revoked session tokens are properly rejected by the backend.
  // This ensures security by preventing unauthorized token refresh attempts.
}
