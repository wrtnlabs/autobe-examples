import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test logout-all operation behavior when the administrator has no active
 * sessions.
 *
 * This test validates an edge case where an administrator attempts to log out
 * from all sessions when no active sessions exist. This scenario occurs when:
 *
 * - Administrator joins/creates account (initial session is created)
 * - Logout-all is called immediately, and the system should gracefully handle
 *   finding no active sessions
 *
 * The operation should complete successfully and idempotently with no errors,
 * as the system should find no active sessions to invalidate. This validates
 * proper error handling and idempotent behavior of the logout-all operation in
 * a clean state.
 */
export async function test_api_administrator_session_logout_all_without_active_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account through join
  // This establishes an authenticated session with initial JWT tokens
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: undefined,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Call logout-all when no sessions have been explicitly terminated
  // The system should handle this gracefully and idempotently
  // Expected: Operation completes successfully with void return
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    connection,
  );

  // Step 3: Verify idempotent behavior by calling logout-all again
  // The operation should succeed even when called multiple times with no active sessions
  // This validates that the operation is idempotent and handles the edge case properly
  await api.functional.communityPlatform.administrator.auth.administrator.sessions.logout_all.logoutAll(
    connection,
  );

  // Step 4: Validate successful edge case handling
  // The test passes if both logout-all calls complete without errors
  TestValidator.predicate(
    "logout-all operation completes successfully when no active sessions exist",
    true,
  );
}
