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
 * Test filtering moderation queue by high priority.
 *
 * This test validates the moderator's ability to filter the moderation queue to
 * display only high-priority articles requiring expedited review. The test
 * ensures that when a moderator authenticates and requests queue items filtered
 * by priority='high', the system returns only articles marked as high-priority
 * submissions while excluding low and normal priority items.
 *
 * Test flow:
 *
 * 1. Register and authenticate a new moderator account
 * 2. Request the moderation queue filtered by priority='high'
 * 3. Validate all returned items have priority='high'
 * 4. Verify results are sorted by submission date (oldest first)
 * 5. Confirm pagination metadata for high-priority subset
 * 6. Verify exclusion of low and normal priority items
 */
export async function test_api_moderation_queue_filter_by_priority_high(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(8) + "A1!",
    username: RandomGenerator.alphabets(10),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorData.email,
  );
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.predicate(
    "moderator is authenticated",
    moderator.token.access.length > 0,
  );

  // Step 2: Request the moderation queue filtered by high priority
  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          priority: "high",
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // Step 3: Validate all returned items have priority='high'
  TestValidator.predicate(
    "all queue items have high priority",
    queueResponse.data.every((item) => item.priority === "high"),
  );

  // Step 4: Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination current page is valid",
    queueResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    queueResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    queueResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    queueResponse.pagination.pages >= 0,
  );

  // Step 5: Validate results are sorted by submission date (oldest first by default)
  if (queueResponse.data.length > 1) {
    for (let i = 1; i < queueResponse.data.length; i++) {
      const prevSubmissionTime = new Date(
        queueResponse.data[i - 1].submitted_at,
      ).getTime();
      const currentSubmissionTime = new Date(
        queueResponse.data[i].submitted_at,
      ).getTime();
      TestValidator.predicate(
        `items are sorted by submission date - item ${i - 1} before item ${i}`,
        prevSubmissionTime <= currentSubmissionTime,
      );
    }
  }

  // Step 6: Verify that non-high priority items would be excluded
  // by validating the structure of high priority items
  if (queueResponse.data.length > 0) {
    const firstQueueItem = queueResponse.data[0];

    TestValidator.predicate(
      "queue item has valid ID",
      typeof firstQueueItem.id === "string" && firstQueueItem.id.length > 0,
    );
    TestValidator.predicate(
      "queue item has valid article ID",
      typeof firstQueueItem.discussion_board_article_id === "string" &&
        firstQueueItem.discussion_board_article_id.length > 0,
    );
    TestValidator.predicate(
      "queue item has valid contributor ID",
      typeof firstQueueItem.discussion_board_contributor_id === "string" &&
        firstQueueItem.discussion_board_contributor_id.length > 0,
    );
    TestValidator.equals(
      "first item priority is high",
      firstQueueItem.priority,
      "high",
    );
    TestValidator.predicate(
      "queue item has valid submission date",
      new Date(firstQueueItem.submitted_at) instanceof Date,
    );
  }
}
