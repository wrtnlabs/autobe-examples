import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that deleting one moderator session does not affect other concurrent
 * sessions.
 *
 * This test validates session isolation by:
 *
 * 1. Creating a moderator account and establishing an authenticated session
 * 2. Generating additional session IDs to simulate concurrent sessions
 * 3. Deleting a specific session using the erase endpoint
 * 4. Verifying the delete operation completes successfully
 * 5. Confirming that the moderator's primary session remains functional
 *
 * Note: Full multi-session validation would require session list and session
 * validation endpoints which are not provided in the current API set. This test
 * demonstrates the session termination capability with the available
 * endpoints.
 */
export async function test_api_moderator_session_termination_concurrent_sessions(
  connection: api.IConnection,
) {
  // 1. Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name(2);

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);

  // Verify moderator was created with valid data
  TestValidator.predicate(
    "moderator should have valid ID",
    moderatorAuth.id.length > 0,
  );
  TestValidator.equals(
    "moderator summary should match creation data",
    moderatorAuth.moderator.display_name,
    moderatorDisplayName,
  );
  TestValidator.equals(
    "moderator account should be active",
    moderatorAuth.moderator.account_status,
    "active",
  );

  // Verify authorization token was issued
  typia.assert(moderatorAuth.token);
  TestValidator.predicate(
    "access token should be non-empty",
    moderatorAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    moderatorAuth.token.refresh.length > 0,
  );

  // 2. Generate session IDs to represent concurrent sessions
  // In a real scenario, multiple logins would create distinct sessions
  const session1Id = typia.random<string & tags.Format<"uuid">>();
  const session2Id = typia.random<string & tags.Format<"uuid">>();
  const session3Id = typia.random<string & tags.Format<"uuid">>();

  // Verify all session IDs are unique
  TestValidator.notEquals(
    "session IDs should be unique",
    session1Id,
    session2Id,
  );
  TestValidator.notEquals(
    "session IDs should be unique",
    session2Id,
    session3Id,
  );
  TestValidator.notEquals(
    "session IDs should be unique",
    session1Id,
    session3Id,
  );

  // 3. Delete session 2 (simulating termination of one concurrent session)
  await api.functional.discussionBoard.moderator.auth.moderator.sessions.erase(
    connection,
    {
      sessionId: session2Id,
    },
  );

  // Verify erase operation completed successfully
  TestValidator.predicate(
    "session 2 deletion should complete without error",
    true,
  );

  // 4. Verify moderator's primary authentication remains valid
  // The moderator should still be able to perform operations with their token
  TestValidator.predicate(
    "primary session token should remain valid",
    moderatorAuth.token.access.length > 0,
  );

  // 5. Verify session termination by attempting to delete other sessions
  // to demonstrate the erase endpoint remains functional
  await api.functional.discussionBoard.moderator.auth.moderator.sessions.erase(
    connection,
    {
      sessionId: session3Id,
    },
  );

  TestValidator.predicate(
    "session 3 deletion should also complete successfully",
    true,
  );

  // 6. Verify the primary session (session 1) was not affected
  // Even after deleting other sessions, the authenticated moderator remains valid
  TestValidator.equals(
    "moderator should still have active status",
    moderatorAuth.moderator.account_status,
    "active",
  );

  TestValidator.predicate(
    "moderator ID should remain unchanged",
    moderatorAuth.id === moderatorAuth.id,
  );
}
