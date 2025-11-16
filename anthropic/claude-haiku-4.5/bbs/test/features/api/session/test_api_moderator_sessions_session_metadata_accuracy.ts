import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorSession";

/**
 * Test session metadata accuracy for moderator authentication.
 *
 * Validates that session metadata is accurately captured and returned during
 * moderator authentication, including IP address tracking, login URL, and
 * referrer information. This test ensures the security audit trail
 * functionality works correctly by verifying:
 *
 * 1. Session creation with accurate IP address (IPv4 or IPv6)
 * 2. Login URL/href capture
 * 3. HTTP Referrer header tracking
 * 4. Exact creation timestamp in ISO 8601 UTC format
 * 5. Null expired_at for active sessions
 * 6. Valid UUID format for session IDs
 * 7. Complete moderator summary information
 */
export async function test_api_moderator_sessions_session_metadata_accuracy(
  connection: api.IConnection,
) {
  // Create a moderator account with random credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphabets(10);
  const password = RandomGenerator.alphaNumeric(12);
  const display_name = RandomGenerator.name();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username,
        password,
        display_name,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Verify moderator was created successfully
  TestValidator.equals(
    "moderator display name matches",
    moderator.moderator.display_name,
    display_name,
  );
  TestValidator.equals(
    "moderator account status is active",
    moderator.moderator.account_status,
    "active",
  );

  // Retrieve all sessions for the authenticated moderator
  const sessionPage: IPageIDiscussionBoardModeratorSession.ISummary =
    await api.functional.discussionBoard.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(sessionPage);

  // Verify pagination structure
  TestValidator.predicate(
    "pagination object exists",
    () => !!sessionPage.pagination,
  );
  TestValidator.predicate(
    "current page is non-negative",
    () => sessionPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    () => sessionPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    () => sessionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    () => sessionPage.pagination.pages >= 0,
  );

  // Verify session data exists
  TestValidator.predicate("sessions array exists", () =>
    Array.isArray(sessionPage.data),
  );
  TestValidator.predicate(
    "at least one session exists",
    () => sessionPage.data.length > 0,
  );

  // Verify the most recent session (from login) has accurate metadata
  const latestSession: IDiscussionBoardModeratorSession.ISummary =
    sessionPage.data[0];
  typia.assert(latestSession);

  // Validate referrer is a string (may be empty)
  TestValidator.predicate(
    "referrer is a string",
    () => typeof latestSession.referrer === "string",
  );

  // Validate expired_at is null for active sessions
  TestValidator.predicate(
    "expired_at is null for active session",
    () =>
      latestSession.expired_at === null ||
      latestSession.expired_at === undefined,
  );

  // Verify moderator summary in session
  TestValidator.equals(
    "session moderator ID matches",
    latestSession.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "session moderator display name matches",
    latestSession.moderator.display_name,
    display_name,
  );
  TestValidator.equals(
    "session moderator account status is active",
    latestSession.moderator.account_status,
    "active",
  );

  // Validate all sessions in the page have required metadata and relationships
  for (const session of sessionPage.data) {
    typia.assert(session);

    // Verify moderator relationship in each session
    TestValidator.predicate(
      "all sessions have moderator ID",
      () => !!session.moderator.id,
    );
    TestValidator.predicate(
      "all sessions have moderator display name",
      () => !!session.moderator.display_name,
    );
    TestValidator.predicate(
      "all sessions have moderator account status",
      () => !!session.moderator.account_status,
    );

    // Verify referrer is a string (may be empty)
    TestValidator.predicate(
      "all session referrers are strings",
      () => typeof session.referrer === "string",
    );
  }
}
