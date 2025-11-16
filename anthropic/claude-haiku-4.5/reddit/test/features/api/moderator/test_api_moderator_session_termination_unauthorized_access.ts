import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModeratorSession";

/**
 * Test that a moderator cannot terminate another moderator's session.
 *
 * Create two separate moderator accounts with their own sessions. Attempt to
 * use the first moderator's authentication to delete a session belonging to the
 * second moderator. Verify that the API denies this action with appropriate
 * authorization error (403 Forbidden). Confirm that the second moderator's
 * session remains active and unaffected. Validate that the system properly
 * validates session ownership before allowing termination.
 *
 * 1. Create first moderator account and authenticate
 * 2. Create second moderator account and authenticate
 * 3. Retrieve second moderator's sessions to get a session ID
 * 4. Switch back to first moderator's authentication
 * 5. Attempt to terminate second moderator's session (should fail with 403)
 * 6. Verify second moderator's session still exists and is active
 * 7. Verify first moderator can still terminate their own sessions successfully
 */
export async function test_api_moderator_session_termination_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Password = "SecurePassword123!";
  const moderator1HRef = "https://example.com/auth";
  const moderator1Referrer = "https://example.com";

  const moderator1Auth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      username: RandomGenerator.alphabets(10),
      password: moderator1Password,
      href: moderator1HRef,
      referrer: moderator1Referrer,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator1Auth);

  // Store moderator1's session info
  const moderator1Sessions1 =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(moderator1Sessions1);
  TestValidator.predicate(
    "moderator1 should have at least one session",
    moderator1Sessions1.data.length > 0,
  );

  // Step 2: Create second moderator account
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Password = "SecurePassword456!";
  const moderator2HRef = "https://example.com/auth";
  const moderator2Referrer = "https://example.com";

  const moderator2Auth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      username: RandomGenerator.alphabets(10),
      password: moderator2Password,
      href: moderator2HRef,
      referrer: moderator2Referrer,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2Auth);

  // Step 3: Get second moderator's sessions
  const moderator2Sessions =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(moderator2Sessions);
  TestValidator.predicate(
    "moderator2 should have at least one session",
    moderator2Sessions.data.length > 0,
  );

  const moderator2SessionId = moderator2Sessions.data[0].id;

  // Step 4: Switch back to first moderator's authentication
  connection.headers ??= {};
  connection.headers.Authorization = moderator1Auth.token.access;

  // Step 5: Attempt to terminate second moderator's session (should fail with 403)
  await TestValidator.httpError(
    "cannot terminate another moderator's session",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.sessions.erase(
        connection,
        {
          sessionId: moderator2SessionId,
        },
      );
    },
  );

  // Step 6: Switch to second moderator and verify session still exists
  connection.headers.Authorization = moderator2Auth.token.access;

  const moderator2SessionsAfter =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(moderator2SessionsAfter);

  const sessionStillExists = moderator2SessionsAfter.data.some(
    (s) => s.id === moderator2SessionId,
  );
  TestValidator.predicate(
    "second moderator's session should still exist after failed termination attempt",
    sessionStillExists,
  );

  // Step 7: Verify second moderator can terminate their own session
  await api.functional.communityPlatform.moderator.auth.moderator.sessions.erase(
    connection,
    {
      sessionId: moderator2SessionId,
    },
  );

  // Verify the session was actually terminated
  const moderator2SessionsFinal =
    await api.functional.communityPlatform.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(moderator2SessionsFinal);

  const sessionTerminated = !moderator2SessionsFinal.data.some(
    (s) => s.id === moderator2SessionId,
  );
  TestValidator.predicate(
    "second moderator should be able to terminate their own session",
    sessionTerminated,
  );
}
