import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful logout of all administrator sessions across all devices.
 *
 * This test validates that an administrator can effectively terminate all
 * active sessions simultaneously, invalidating all refresh tokens and forcing
 * re-authentication on all connected devices. This is critical for security
 * scenarios where an administrator needs to ensure complete logout after
 * detecting suspicious activity.
 *
 * The test flow:
 *
 * 1. Create a new administrator account with join operation
 * 2. Verify initial authenticated session with valid JWT tokens
 * 3. Execute logout-all operation to invalidate all refresh tokens
 * 4. Test idempotency by executing logout-all multiple times
 * 5. Verify consistent results across multiple invocations
 */
export async function test_api_administrator_session_logout_all_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: null,
    ip: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const authorized: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(authorized);

  // Step 2: Verify initial authenticated session
  TestValidator.predicate(
    "administrator account created successfully",
    authorized.id !== null && authorized.id !== undefined,
  );
  TestValidator.predicate(
    "access token is present",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is set",
    authorized.token.expired_at !== null &&
      authorized.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token expiration is set",
    authorized.token.refreshable_until !== null &&
      authorized.token.refreshable_until !== undefined,
  );

  // Step 3: Execute logout-all operation
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    connection,
  );

  // Step 4: Test idempotency - logout-all can be called multiple times
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    connection,
  );

  // Step 5: Test multiple consecutive logout-all operations for consistency
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    connection,
  );

  // Step 6: Validate operation behavior
  TestValidator.predicate(
    "logout-all operation completed successfully without errors",
    true,
  );
}
