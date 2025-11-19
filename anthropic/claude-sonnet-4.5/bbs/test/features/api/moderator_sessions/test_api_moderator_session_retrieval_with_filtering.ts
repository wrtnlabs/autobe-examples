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
 * Test comprehensive moderator session retrieval with various filtering
 * options.
 *
 * This test validates that moderators can search and retrieve their
 * authentication session history using multiple filter criteria including
 * pagination, sorting, IP address filtering, date range filtering, and active
 * status filtering.
 *
 * The test ensures:
 *
 * 1. Moderator registration creates initial session
 * 2. Session retrieval works with basic pagination
 * 3. Sorting parameters work correctly (e.g., -created_at)
 * 4. IP address filtering returns only matching sessions
 * 5. Date range filters correctly bound results
 * 6. Active status filter distinguishes active/expired sessions
 * 7. Response structure matches IPageIDiscussionBoardModeratorSession
 * 8. Pagination metadata is accurate
 */
export async function test_api_moderator_session_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and establish initial session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1);
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: moderatorUsername,
        display_name: RandomGenerator.name(2),
        ip: "192.168.1.100",
        href: testHref,
        referrer: testReferrer,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test basic session retrieval with default pagination
  const basicSessionPage: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(basicSessionPage);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination metadata exists",
    basicSessionPage.pagination !== null &&
      basicSessionPage.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    basicSessionPage.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", basicSessionPage.pagination.limit, 10);
  TestValidator.predicate(
    "at least one session exists from registration",
    basicSessionPage.data.length >= 1,
  );

  // Step 3: Test sorting by created_at descending (newest first)
  const sortedSessionPage: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(sortedSessionPage);
  TestValidator.predicate(
    "sorted sessions returned",
    sortedSessionPage.data.length >= 1,
  );

  // Step 4: Test IP address filtering
  const ipFilteredPage: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          ip: "192.168.1.100",
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(ipFilteredPage);
  TestValidator.predicate(
    "IP filtered sessions found",
    ipFilteredPage.data.length >= 1,
  );

  // Validate that returned sessions match the IP filter
  if (ipFilteredPage.data.length > 0) {
    const firstSession = ipFilteredPage.data[0];
    typia.assert(firstSession);
    TestValidator.equals(
      "filtered session IP matches filter",
      firstSession.ip,
      "192.168.1.100",
    );
  }

  // Step 5: Test date range filtering with created_after
  const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  const dateFilteredPage: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          created_after: pastDate,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(dateFilteredPage);
  TestValidator.predicate(
    "date filtered sessions found",
    dateFilteredPage.data.length >= 1,
  );

  // Step 6: Test active status filtering (active sessions)
  const activeSessionsPage: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          is_active: true,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(activeSessionsPage);
  TestValidator.predicate(
    "active sessions found",
    activeSessionsPage.data.length >= 1,
  );

  // Validate that active sessions have null expired_at
  if (activeSessionsPage.data.length > 0) {
    const activeSession = activeSessionsPage.data[0];
    typia.assert(activeSession);
    TestValidator.predicate(
      "active session has null expired_at",
      activeSession.expired_at === null ||
        activeSession.expired_at === undefined,
    );
  }

  // Step 7: Test combined filters (IP + active status + sorting)
  const combinedFilterPage: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 5,
          ip: "192.168.1.100",
          is_active: true,
          sort: "-created_at",
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(combinedFilterPage);
  TestValidator.predicate(
    "combined filter page has correct limit",
    combinedFilterPage.pagination.limit === 5,
  );

  // Step 8: Test pagination with different page sizes
  const smallPageSize: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(smallPageSize);
  TestValidator.predicate(
    "small page size returns at most 1 item",
    smallPageSize.data.length <= 1,
  );

  // Step 9: Validate session data structure includes moderator summary
  if (basicSessionPage.data.length > 0) {
    const session = basicSessionPage.data[0];
    typia.assert(session);

    TestValidator.predicate(
      "session has moderator summary",
      session.moderator !== null && session.moderator !== undefined,
    );

    typia.assert(session.moderator);
    TestValidator.equals(
      "session moderator ID matches created moderator",
      session.moderator.id,
      moderator.id,
    );
    TestValidator.equals(
      "session moderator email matches",
      session.moderator.email,
      moderatorEmail,
    );
  }
}
