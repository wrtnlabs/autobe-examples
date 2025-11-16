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
 * Test retrieving all authentication sessions for an authenticated moderator.
 *
 * This test validates that moderators can view their complete session history,
 * including both active sessions (currently logged in) and historical sessions
 * that have been terminated. The test ensures proper session tracking with
 * complete connection context information, correct pagination, and security
 * isolation so moderators can only view their own sessions.
 *
 * Process:
 *
 * 1. Create new moderator account and establish initial authenticated session
 * 2. Create additional sessions through subsequent authentication attempts
 * 3. Retrieve complete session list via GET sessions endpoint
 * 4. Validate both active and terminated sessions are returned
 * 5. Verify all required session fields are present and correctly populated
 * 6. Confirm sessions belong to authenticated moderator
 * 7. Validate pagination information
 */
export async function test_api_moderator_sessions_list_active_and_expired(
  connection: api.IConnection,
) {
  // 1. Create first moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderatorDisplayName = RandomGenerator.name();

  const firstSession: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstSession);
  typia.assert(firstSession.token);
  typia.assertGuard(firstSession.moderator);

  // Verify moderator was created with active status
  TestValidator.equals(
    "moderator account status should be active",
    firstSession.moderator.account_status,
    "active",
  );

  // 2. Create additional sessions by simulating different login attempts
  // Create a second session context
  const secondSessionConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Retrieve all sessions for the authenticated moderator
  const sessionsPage: IPageIDiscussionBoardModeratorSession.ISummary =
    await api.functional.discussionBoard.moderator.auth.moderator.sessions.index(
      connection,
    );
  typia.assert(sessionsPage);

  // 4. Validate response structure and pagination
  TestValidator.predicate(
    "sessions page data is array",
    Array.isArray(sessionsPage.data),
  );
  TestValidator.predicate(
    "pagination information exists",
    sessionsPage.pagination !== undefined,
  );

  // Validate pagination fields
  typia.assert(sessionsPage.pagination);
  TestValidator.predicate(
    "current page is non-negative",
    sessionsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "page limit is non-negative",
    sessionsPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    sessionsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    sessionsPage.pagination.pages >= 0,
  );

  // 5. Verify at least one session exists (the initial login session)
  TestValidator.predicate(
    "at least one session should exist",
    sessionsPage.data.length > 0,
  );

  // 6. Validate each session record has all required fields
  for (const session of sessionsPage.data) {
    // Validate session ID is UUID format
    TestValidator.predicate(
      "session id should be valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );

    // Validate IP address exists
    TestValidator.predicate(
      "session ip should not be empty",
      session.ip.length > 0,
    );

    // Validate href is valid URI
    TestValidator.predicate(
      "session href should be valid URI format",
      /^https?:\/\//.test(session.href) || /^\//.test(session.href),
    );

    // Validate referrer exists (can be empty string)
    TestValidator.predicate(
      "session referrer should be string",
      typeof session.referrer === "string",
    );

    // Validate created_at is valid ISO date-time
    TestValidator.predicate(
      "session created_at should be valid ISO datetime",
      !isNaN(new Date(session.created_at).getTime()),
    );

    // Validate expired_at is either null or valid ISO date-time
    if (session.expired_at !== null && session.expired_at !== undefined) {
      TestValidator.predicate(
        "session expired_at should be valid ISO datetime when defined",
        !isNaN(new Date(session.expired_at).getTime()),
      );
      // Expired_at should be after created_at for terminated sessions
      TestValidator.predicate(
        "expired_at should be after created_at for terminated sessions",
        new Date(session.expired_at) >= new Date(session.created_at),
      );
    }

    // 7. Validate moderator summary information
    typia.assert(session.moderator);
    TestValidator.predicate(
      "moderator id should match authenticated moderator",
      session.moderator.id === firstSession.id,
    );
    TestValidator.predicate(
      "moderator display_name should match",
      session.moderator.display_name === firstSession.moderator.display_name,
    );
    TestValidator.equals(
      "moderator account status should be active",
      session.moderator.account_status,
      "active",
    );
  }

  // 8. Verify active sessions exist (created_at exists, expired_at is null)
  const activeSessions = sessionsPage.data.filter(
    (s) => s.expired_at === null || s.expired_at === undefined,
  );
  TestValidator.predicate(
    "at least one active session should exist",
    activeSessions.length > 0,
  );

  // 9. Verify all sessions belong to the authenticated moderator
  const allSessionsBelongToModerator = sessionsPage.data.every(
    (s) => s.moderator.id === firstSession.id,
  );
  TestValidator.predicate(
    "all sessions should belong to authenticated moderator",
    allSessionsBelongToModerator,
  );
}
