import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationQueue";

export async function test_api_moderation_queue_sort_by_priority_high_first(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account and authenticate
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request moderation queue with priority sorting (high first)
  const queueResult: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "priority",
          sort_order: "desc",
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResult);

  // Step 3: Validate the queue result contains pagination info
  TestValidator.predicate(
    "queue result has pagination",
    queueResult.pagination !== undefined && queueResult.pagination !== null,
  );

  // Step 4: Validate queue items are sorted by priority (high first)
  if (queueResult.data.length > 0) {
    const priorityOrder = { high: 3, normal: 2, low: 1 };

    // Verify items are in correct priority order
    for (let i = 0; i < queueResult.data.length - 1; i++) {
      const currentItem = queueResult.data[i];
      const nextItem = queueResult.data[i + 1];

      const currentPriorityValue = priorityOrder[currentItem.priority];
      const nextPriorityValue = priorityOrder[nextItem.priority];

      TestValidator.predicate(
        `item at index ${i} has higher or equal priority than item at index ${i + 1}`,
        currentPriorityValue >= nextPriorityValue,
      );
    }

    // Verify first item is high priority (if any high priority items exist)
    const hasHighPriority = queueResult.data.some(
      (item) => item.priority === "high",
    );
    if (hasHighPriority) {
      TestValidator.equals(
        "first item should be high priority when high priority items exist",
        queueResult.data[0].priority,
        "high",
      );
    }
  }

  // Step 5: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    queueResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    queueResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    queueResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    queueResult.pagination.pages >= 0,
  );
}
