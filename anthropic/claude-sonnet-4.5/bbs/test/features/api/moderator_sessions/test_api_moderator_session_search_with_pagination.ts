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
 * Test moderator session search and pagination functionality.
 *
 * This test validates the complete workflow of moderator session management:
 *
 * 1. Register a new moderator account
 * 2. Authenticate and create session
 * 3. Query session list with pagination
 * 4. Validate pagination metadata accuracy
 * 5. Verify session summary completeness
 * 6. Test sorting capabilities (ascending/descending)
 */
export async function test_api_moderator_session_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorUsername = RandomGenerator.name(2);

  const registeredModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(registeredModerator);

  // Verify moderator creation
  TestValidator.equals(
    "registered moderator email matches",
    registeredModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "registered moderator username matches",
    registeredModerator.username,
    moderatorUsername,
  );

  // Step 2: Query moderator sessions with default pagination
  const defaultPageRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardModeratorSession.IRequest;

  const defaultPage: IPageIDiscussionBoardModeratorSession.ISummary =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: defaultPageRequest,
      },
    );
  typia.assert(defaultPage);

  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "default page has at least one session",
    defaultPage.data.length >= 1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    defaultPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is positive",
    defaultPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages count is positive",
    defaultPage.pagination.pages > 0,
  );

  // Step 4: Verify session summary structure
  const firstSession = defaultPage.data[0];
  typia.assert(firstSession);

  TestValidator.equals(
    "session moderator ID matches",
    firstSession.discussion_board_moderator_id,
    registeredModerator.id,
  );

  // Step 5: Test ascending sort order
  const ascendingRequest = {
    page: 1,
    limit: 10,
    sort: "created_at" as const,
  } satisfies IDiscussionBoardModeratorSession.IRequest;

  const ascendingPage: IPageIDiscussionBoardModeratorSession.ISummary =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: ascendingRequest,
      },
    );
  typia.assert(ascendingPage);

  TestValidator.predicate(
    "ascending sort returns sessions",
    ascendingPage.data.length > 0,
  );

  // Step 6: Test descending sort order
  const descendingRequest = {
    page: 1,
    limit: 10,
    sort: "-created_at" as const,
  } satisfies IDiscussionBoardModeratorSession.IRequest;

  const descendingPage: IPageIDiscussionBoardModeratorSession.ISummary =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: descendingRequest,
      },
    );
  typia.assert(descendingPage);

  TestValidator.predicate(
    "descending sort returns sessions",
    descendingPage.data.length > 0,
  );

  // Step 7: Test pagination with different page size
  const smallPageRequest = {
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardModeratorSession.IRequest;

  const smallPage: IPageIDiscussionBoardModeratorSession.ISummary =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: registeredModerator.id,
        body: smallPageRequest,
      },
    );
  typia.assert(smallPage);

  TestValidator.equals("small page limit is 5", smallPage.pagination.limit, 5);
  TestValidator.predicate(
    "small page data length does not exceed limit",
    smallPage.data.length <= 5,
  );
}
