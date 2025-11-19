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
 * Test moderator session retrieval with various pagination and sorting
 * configurations.
 *
 * This test validates that pagination controls (page, limit) and sorting
 * options work correctly for managing session history. Creates a moderator
 * account which generates an initial session, then retrieves sessions using
 * different pagination settings: varying page sizes (10-100), different page
 * numbers, and various sort configurations including sorting by created_at
 * descending (newest first) and ascending order, as well as sorting by IP
 * address. Verifies response includes correct pagination metadata and that the
 * data array contains the expected number of sessions sorted in the specified
 * order.
 */
export async function test_api_moderator_session_retrieval_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account which automatically generates an initial session
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorPassword = "SecurePass123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        display_name: RandomGenerator.name(),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test pagination with default settings (should return at least the initial session)
  const defaultPage: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {} satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(defaultPage);

  TestValidator.predicate(
    "default pagination should return at least one session",
    defaultPage.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination metadata should have valid current page",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination metadata should have valid total records",
    defaultPage.pagination.records >= 1,
  );

  // Step 3: Test with small page size (limit = 10)
  const smallPageSize: IPageIDiscussionBoardModeratorSession =
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
  typia.assert(smallPageSize);

  TestValidator.predicate(
    "small page size should respect limit of 10",
    smallPageSize.data.length <= 10,
  );
  TestValidator.equals(
    "small page size limit should be 10",
    smallPageSize.pagination.limit,
    10,
  );

  // Step 4: Test with medium page size (limit = 50)
  const mediumPageSize: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(mediumPageSize);

  TestValidator.predicate(
    "medium page size should respect limit of 50",
    mediumPageSize.data.length <= 50,
  );
  TestValidator.equals(
    "medium page size limit should be 50",
    mediumPageSize.pagination.limit,
    50,
  );

  // Step 5: Test with maximum page size (limit = 100)
  const maxPageSize: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(maxPageSize);

  TestValidator.predicate(
    "maximum page size should respect limit of 100",
    maxPageSize.data.length <= 100,
  );
  TestValidator.equals(
    "maximum page size limit should be 100",
    maxPageSize.pagination.limit,
    100,
  );

  // Step 6: Test sorting by created_at in descending order (newest first)
  const sortedDescending: IPageIDiscussionBoardModeratorSession =
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
  typia.assert(sortedDescending);

  TestValidator.predicate(
    "descending sort should return sessions",
    sortedDescending.data.length >= 1,
  );

  // Verify descending order if multiple sessions exist
  if (sortedDescending.data.length > 1) {
    const firstDate = new Date(sortedDescending.data[0].created_at);
    const secondDate = new Date(sortedDescending.data[1].created_at);
    TestValidator.predicate(
      "sessions should be sorted by created_at descending",
      firstDate >= secondDate,
    );
  }

  // Step 7: Test sorting by created_at in ascending order (oldest first)
  const sortedAscending: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          sort: "+created_at",
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(sortedAscending);

  TestValidator.predicate(
    "ascending sort should return sessions",
    sortedAscending.data.length >= 1,
  );

  // Step 8: Test sorting by IP address
  const sortedByIp: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          sort: "+ip",
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(sortedByIp);

  TestValidator.predicate(
    "IP sort should return sessions",
    sortedByIp.data.length >= 1,
  );

  // Step 9: Test page navigation (page 2)
  const secondPage: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current should be 2",
    secondPage.pagination.current,
    2,
  );

  // Step 10: Verify pagination metadata calculations
  TestValidator.predicate(
    "total pages should match records divided by limit",
    defaultPage.pagination.pages ===
      Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
  );
}
