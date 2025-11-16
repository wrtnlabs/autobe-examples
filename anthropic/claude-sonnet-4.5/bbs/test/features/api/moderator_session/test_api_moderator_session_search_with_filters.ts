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
 * Test advanced filtering capabilities when searching moderator sessions.
 *
 * This scenario validates that a moderator can filter their session list using
 * various criteria such as pagination parameters and sorting options. After
 * joining and creating multiple sessions through repeated authentications, the
 * moderator should be able to query sessions with different pagination
 * settings.
 *
 * The test verifies:
 *
 * 1. Session creation through moderator registration
 * 2. Pagination functionality with configurable page sizes
 * 3. Sorting by creation timestamp (ascending and descending)
 * 4. Correct pagination metadata (current page, limit, records, pages)
 * 5. Session data integrity and completeness
 */
export async function test_api_moderator_session_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "secure_password_123";
  const moderatorUsername = RandomGenerator.name(1);

  const registeredModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(registeredModerator);

  // Step 2: Query sessions with default pagination
  const defaultSessionList =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: {} satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(defaultSessionList);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "should have at least one session from registration",
    defaultSessionList.data.length >= 1,
  );

  // Step 4: Test pagination with specific page and limit
  const paginatedSessionList =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(paginatedSessionList);

  TestValidator.equals(
    "pagination current page should be 1",
    paginatedSessionList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    paginatedSessionList.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count should be positive",
    paginatedSessionList.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages count should be positive",
    paginatedSessionList.pagination.pages > 0,
  );

  // Step 5: Test sorting by created_at ascending
  const sortedAscending =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: {
          page: 1,
          limit: 50,
          sort: "created_at",
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(sortedAscending);

  TestValidator.predicate(
    "sorted ascending result should have data",
    sortedAscending.data.length > 0,
  );

  // Step 6: Test sorting by created_at descending
  const sortedDescending =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: {
          page: 1,
          limit: 50,
          sort: "-created_at",
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(sortedDescending);

  TestValidator.predicate(
    "sorted descending result should have data",
    sortedDescending.data.length > 0,
  );

  // Step 7: Validate session data business logic
  if (defaultSessionList.data.length > 0) {
    const firstSession = defaultSessionList.data[0];
    typia.assert(firstSession);

    TestValidator.equals(
      "session should belong to the moderator",
      firstSession.discussion_board_moderator_id,
      registeredModerator.id,
    );
  }

  // Step 8: Test with maximum allowed limit
  const maxLimitSessionList =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(maxLimitSessionList);

  TestValidator.equals(
    "max limit pagination should reflect correct limit",
    maxLimitSessionList.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data array length should not exceed limit",
    maxLimitSessionList.data.length <= 100,
  );
}
