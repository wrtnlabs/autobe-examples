import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationQueue";

/**
 * Test navigating to second page of moderation queue results.
 *
 * This test validates the pagination functionality of the moderation queue API.
 * A moderator authenticates, requests the first page to establish a baseline,
 * then requests the second page with page=2 and limit=20. The test confirms
 * that:
 *
 * 1. Second page returns different queue items than the first page
 * 2. Pagination metadata shows current page = 2
 * 3. Total pages is correctly calculated
 * 4. Pagination limit matches the requested limit of 20
 * 5. Total records count is consistent across page requests
 */
export async function test_api_moderation_queue_pagination_second_page(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authentication successful",
    moderator.id !== null && moderator.email === moderatorEmail,
  );

  // 2. Request first page of moderation queue (page 1)
  const firstPageResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  TestValidator.equals(
    "first page current page number",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPageResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "first page has data",
    firstPageResponse.data.length > 0,
  );

  const totalRecords = firstPageResponse.pagination.records;
  const totalPages = firstPageResponse.pagination.pages;
  const firstPageIds = firstPageResponse.data.map((item) => item.id);

  // 3. Request second page of moderation queue (page 2)
  const secondPageResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(secondPageResponse);

  // 4. Validate second page pagination metadata
  TestValidator.equals(
    "second page current page number",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    secondPageResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records consistent",
    secondPageResponse.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "total pages consistent",
    secondPageResponse.pagination.pages,
    totalPages,
  );

  // 5. Validate second page items are different from first page
  const secondPageIds = secondPageResponse.data.map((item) => item.id);
  const hasNoOverlap = firstPageIds.every((id) => !secondPageIds.includes(id));
  TestValidator.predicate(
    "second page items are different from first page",
    hasNoOverlap,
  );

  // 6. Validate page 2 has expected number of items or is the last page
  if (
    secondPageResponse.pagination.current < secondPageResponse.pagination.pages
  ) {
    TestValidator.equals(
      "second page has expected count",
      secondPageResponse.data.length,
      20,
    );
  } else {
    TestValidator.predicate(
      "second page is last page with remaining items",
      secondPageResponse.data.length > 0 &&
        secondPageResponse.data.length <= 20,
    );
  }

  // 7. Validate each queue item has required fields
  secondPageResponse.data.forEach((queueItem) => {
    TestValidator.predicate(
      `queue item ${queueItem.id} has required id`,
      queueItem.id !== null && queueItem.id.length > 0,
    );
    TestValidator.predicate(
      `queue item ${queueItem.id} has article reference`,
      queueItem.discussion_board_article_id !== null &&
        queueItem.discussion_board_article_id.length > 0,
    );
    TestValidator.predicate(
      `queue item ${queueItem.id} has contributor reference`,
      queueItem.discussion_board_contributor_id !== null &&
        queueItem.discussion_board_contributor_id.length > 0,
    );
    TestValidator.predicate(
      `queue item ${queueItem.id} has valid priority`,
      ["normal", "high", "low"].includes(queueItem.priority),
    );
  });
}
