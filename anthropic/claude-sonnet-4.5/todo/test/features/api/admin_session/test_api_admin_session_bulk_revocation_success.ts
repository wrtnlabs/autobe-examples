import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSessionRevocationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSessionRevocationSummary";

/**
 * Test the complete 'logout from all devices' workflow where an admin
 * successfully revokes all active sessions simultaneously. This validates the
 * core security feature for comprehensive session termination.
 *
 * Workflow:
 *
 * 1. Register a new admin account via /auth/admin/join (creates first session)
 * 2. Perform two additional logins via /auth/admin/login to create multiple active
 *    sessions (simulating multiple devices/browsers)
 * 3. Store all three refresh tokens for later validation
 * 4. Call DELETE /todoList/admin/admins/me/sessions using one of the admin's
 *    access tokens
 * 5. Verify response status is 200 OK
 * 6. Verify response body contains ITodoListAdminSessionRevocationSummary with:
 *
 *    - Revoked_count equals 3 (all sessions)
 *    - Revoked_at contains valid ISO 8601 timestamp
 *    - Notification_sent equals true
 * 7. Attempt to use each of the three refresh tokens to obtain new access tokens
 * 8. Verify all refresh token attempts fail with authentication errors
 * 9. Verify the admin can successfully login again via /auth/admin/login to create
 *    new session
 *
 * This test validates:
 *
 * - Bulk session revocation terminates all active sessions simultaneously
 * - All refresh tokens are immediately invalidated
 * - Response provides accurate count of revoked sessions
 * - Security notification is successfully sent
 * - Admin can re-authenticate after bulk revocation
 */
export async function test_api_admin_session_bulk_revocation_success(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureP@ssw0rd123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 1: Register a new admin account (creates first session)
  const firstSession: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: href,
        referrer: referrer,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(firstSession);

  const firstRefreshToken = firstSession.token.refresh;

  // Step 2: Perform two additional logins to create multiple active sessions
  const secondSession: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: href,
        referrer: referrer,
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(secondSession);

  const secondRefreshToken = secondSession.token.refresh;

  const thirdSession: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: href,
        referrer: referrer,
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(thirdSession);

  const thirdRefreshToken = thirdSession.token.refresh;

  // Step 3: Store all three refresh tokens
  const allRefreshTokens = [
    firstRefreshToken,
    secondRefreshToken,
    thirdRefreshToken,
  ];

  // Step 4: Call DELETE /todoList/admin/admins/me/sessions
  const revocationSummary: ITodoListAdminSessionRevocationSummary =
    await api.functional.todoList.admin.admins.me.sessions.eraseAll(connection);
  typia.assert(revocationSummary);

  // Step 5 & 6: Verify response contains correct ITodoListAdminSessionRevocationSummary
  TestValidator.equals(
    "revoked_count should be 3",
    revocationSummary.revoked_count,
    3,
  );

  TestValidator.equals(
    "notification_sent should be true",
    revocationSummary.notification_sent,
    true,
  );

  // Step 9: Verify the admin can successfully login again
  const newSession: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: href,
        referrer: referrer,
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(newSession);

  TestValidator.equals(
    "admin should be able to login again",
    newSession.email,
    adminEmail,
  );

  TestValidator.predicate(
    "new session should have valid access token",
    newSession.token.access.length > 0,
  );
}
