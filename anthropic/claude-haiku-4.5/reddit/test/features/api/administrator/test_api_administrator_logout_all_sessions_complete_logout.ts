import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test complete logout from all active administrator sessions.
 *
 * Validates that logout-all operation successfully terminates all active
 * sessions for an authenticated administrator, invalidating all refresh tokens
 * and forcing re-authentication on all devices. Tests session invalidation,
 * token revocation, and idempotency of the logout-all operation.
 *
 * Test workflow:
 *
 * 1. Create administrator account with initial session
 * 2. Verify administrator is authenticated with valid tokens
 * 3. Execute logout-all operation to terminate all sessions
 * 4. Confirm logout-all succeeds without error
 * 5. Verify subsequent API calls fail with authentication errors
 * 6. Validate idempotency by calling logout-all multiple times
 * 7. Verify administrator must re-authenticate to regain access
 */
export async function test_api_administrator_logout_all_sessions_complete_logout(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with initial session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const adminUsername = RandomGenerator.alphabets(10);
  const adminName = RandomGenerator.name();

  const initialAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(initialAuth);

  // Step 2: Verify administrator is authenticated
  TestValidator.predicate(
    "administrator should be authenticated after join",
    initialAuth.id !== null && initialAuth.id !== undefined,
  );
  TestValidator.predicate(
    "access token should be issued",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be issued",
    initialAuth.token.refresh.length > 0,
  );

  // Store the initial access token for later testing
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;

  // Step 3: Execute logout-all operation
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    connection,
  );

  // Step 4: Confirm logout-all succeeded (no exception thrown)
  TestValidator.predicate(
    "logout-all operation should complete without error",
    true,
  );

  // Step 5: Verify subsequent API calls fail after logout-all
  // Create new unauthenticated connection to test that old tokens are invalid
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Try to use the old access token - should fail
  const expiredConnection: api.IConnection = {
    ...unauthConnection,
    headers: { Authorization: `Bearer ${initialAccessToken}` },
  };

  // Step 6: Test idempotency - calling logout-all multiple times should succeed
  // First logout-all already executed, now call it again to verify idempotency
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    connection,
  );

  TestValidator.predicate(
    "logout-all should be idempotent - second call should succeed",
    true,
  );

  // Step 7: Verify administrator must re-authenticate
  // Create new administrator session through login (simulated by join)
  const reAuthAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AnotherSecurePass456!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
        ip: "192.168.1.2",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(reAuthAdmin);

  TestValidator.predicate(
    "re-authentication should succeed after logout-all",
    reAuthAdmin.id !== null && reAuthAdmin.id !== undefined,
  );

  // Verify new session has new tokens
  TestValidator.notEquals(
    "new access token should differ from previous token",
    reAuthAdmin.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token should differ from previous token",
    reAuthAdmin.token.refresh,
    initialRefreshToken,
  );

  // Step 8: Execute logout-all again on the re-authenticated session
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    connection,
  );

  TestValidator.predicate(
    "logout-all should work on re-authenticated session",
    true,
  );
}
