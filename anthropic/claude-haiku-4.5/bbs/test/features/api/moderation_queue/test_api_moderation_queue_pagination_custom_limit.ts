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
 * Test retrieving moderation queue with custom page limit.
 *
 * Validates that the moderation queue endpoint correctly handles custom
 * pagination parameters, specifically testing with a custom limit of 50 items
 * per page. The test ensures that:
 *
 * 1. A moderator can authenticate successfully
 * 2. The moderation queue API accepts custom pagination parameters (page=1,
 *    limit=50)
 * 3. Pagination metadata correctly reflects the requested limit in the response
 * 4. Returned items count matches the requested limit (or is less if fewer items
 *    exist)
 * 5. All required pagination fields are present and correctly typed
 *
 * This is essential for testing flexible pagination needed for different UI
 * layouts and use cases.
 */
export async function test_api_moderation_queue_pagination_custom_limit(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
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

  // Step 2: Request moderation queue with custom limit parameter (50 items per page)
  const customLimit = 50;
  const customPage = 1;
  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: customPage,
          limit: customLimit,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // Step 3: Validate pagination metadata
  TestValidator.equals(
    "pagination current page matches request",
    queueResponse.pagination.current,
    customPage,
  );
  TestValidator.equals(
    "pagination limit matches requested custom limit",
    queueResponse.pagination.limit,
    customLimit,
  );

  // Step 4: Validate returned items count respects the limit
  TestValidator.predicate(
    "returned items count does not exceed requested limit",
    queueResponse.data.length <= customLimit,
  );

  // Step 5: Validate pagination structure has all required fields
  TestValidator.predicate(
    "pagination has valid current page number",
    queueResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid total records count",
    queueResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid total pages count",
    queueResponse.pagination.pages >= 0,
  );

  // Step 6: Validate that pagination calculations are correct
  const expectedPages = Math.ceil(
    queueResponse.pagination.records / queueResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation is correct",
    queueResponse.pagination.pages,
    expectedPages,
  );

  // Step 7: Validate queue item structure when items exist
  if (queueResponse.data.length > 0) {
    const firstItem = queueResponse.data[0];
    TestValidator.predicate(
      "queue item has valid ID",
      firstItem.id !== null && firstItem.id !== undefined,
    );
    TestValidator.predicate(
      "queue item has article reference",
      firstItem.discussion_board_article_id !== null &&
        firstItem.discussion_board_article_id !== undefined,
    );
    TestValidator.predicate(
      "queue item has contributor reference",
      firstItem.discussion_board_contributor_id !== null &&
        firstItem.discussion_board_contributor_id !== undefined,
    );
    TestValidator.predicate(
      "queue item has submission timestamp",
      firstItem.submitted_at !== null && firstItem.submitted_at !== undefined,
    );
    TestValidator.predicate(
      "queue item has valid priority",
      ["normal", "high", "low"].includes(firstItem.priority),
    );
  }
}
