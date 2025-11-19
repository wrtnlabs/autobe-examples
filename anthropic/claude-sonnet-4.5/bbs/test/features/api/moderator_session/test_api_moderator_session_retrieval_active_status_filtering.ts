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
 * Test moderator session retrieval filtered by active status to distinguish
 * between current and terminated sessions.
 *
 * This scenario validates the is_active filter parameter correctly separates
 * active sessions (expired_at is null) from terminated sessions (expired_at is
 * not null). Create a moderator account to establish an active session, then
 * retrieve sessions with is_active=true to verify only active sessions are
 * returned. The test should confirm that active sessions have null expired_at
 * values and that the filter accurately identifies currently authenticated
 * moderators. This functionality is essential for security monitoring use cases
 * such as detecting unusual concurrent sessions, identifying all currently
 * logged-in moderators for emergency actions, and reviewing historical session
 * activity separately from active sessions.
 */
export async function test_api_moderator_session_retrieval_active_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with active authentication session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.alphaNumeric(8);

  const moderatorData = {
    email: moderatorEmail,
    password: moderatorPassword,
    username: moderatorUsername,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authorizedModerator);

  // Step 2: Retrieve sessions with is_active=true filter
  const activeSessionsRequest = {
    page: 1,
    limit: 10,
    is_active: true,
  } satisfies IDiscussionBoardModeratorSession.IRequest;

  const activeSessionsPage: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: authorizedModerator.id,
        body: activeSessionsRequest,
      },
    );
  typia.assert(activeSessionsPage);

  // Step 3: Validate pagination metadata
  typia.assert(activeSessionsPage.pagination);
  TestValidator.predicate(
    "pagination should have valid structure",
    activeSessionsPage.pagination.current === 1 &&
      activeSessionsPage.pagination.limit === 10,
  );

  // Step 4: Validate that at least one active session exists (the one just created)
  TestValidator.predicate(
    "active sessions should exist after moderator join",
    activeSessionsPage.data.length > 0,
  );

  // Step 5: Validate all returned sessions have null expired_at values
  for (const session of activeSessionsPage.data) {
    TestValidator.equals(
      "active session should have null expired_at",
      session.expired_at,
      null,
    );
  }

  // Step 6: Verify the moderator ID matches in all sessions
  for (const session of activeSessionsPage.data) {
    TestValidator.equals(
      "session should belong to the created moderator",
      session.discussion_board_moderator_id,
      authorizedModerator.id,
    );

    // Validate moderator summary information
    TestValidator.equals(
      "session moderator username should match",
      session.moderator.username,
      authorizedModerator.username,
    );

    TestValidator.equals(
      "session moderator email should match",
      session.moderator.email,
      authorizedModerator.email,
    );
  }

  // Step 7: Test filtering with is_active=false to verify no terminated sessions exist for new moderator
  const inactiveSessionsRequest = {
    page: 1,
    limit: 10,
    is_active: false,
  } satisfies IDiscussionBoardModeratorSession.IRequest;

  const inactiveSessionsPage: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: authorizedModerator.id,
        body: inactiveSessionsRequest,
      },
    );
  typia.assert(inactiveSessionsPage);

  // Step 8: Verify no inactive sessions for newly created moderator
  TestValidator.equals(
    "newly created moderator should have no terminated sessions",
    inactiveSessionsPage.data.length,
    0,
  );
}
