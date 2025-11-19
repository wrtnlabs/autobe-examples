import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationQueue";

export async function test_api_moderation_queue_response_includes_review_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request the moderation queue with default parameters
  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // Step 3: Validate response structure includes pagination
  TestValidator.predicate(
    "response includes pagination metadata",
    queueResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is present",
    queueResponse.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination limit is present",
    queueResponse.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination records count is present",
    queueResponse.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination pages count is present",
    queueResponse.pagination.pages !== undefined,
  );

  // Step 4: Validate queue items include review status indicators
  if (queueResponse.data && queueResponse.data.length > 0) {
    // Iterate through queue items to validate review status fields
    for (const queueItem of queueResponse.data) {
      // Verify each item has required identification fields
      TestValidator.predicate(
        "queue item has valid UUID id",
        queueItem.id !== undefined && queueItem.id.length > 0,
      );
      TestValidator.predicate(
        "queue item has article ID reference",
        queueItem.discussion_board_article_id !== undefined,
      );
      TestValidator.predicate(
        "queue item has contributor ID reference",
        queueItem.discussion_board_contributor_id !== undefined,
      );

      // Validate review status indicators - CORE TEST REQUIREMENT
      TestValidator.predicate(
        "queue item has review_started_at field for review status tracking",
        queueItem.review_started_at !== undefined,
      );

      // review_started_at is either null (unreviewed) or datetime string (in-progress)
      // This field is the key indicator for workflow status
      if (queueItem.review_started_at !== null) {
        TestValidator.predicate(
          "review_started_at contains valid ISO 8601 datetime when in-progress",
          typeof queueItem.review_started_at === "string" &&
            queueItem.review_started_at.length > 0,
        );
      } else {
        TestValidator.predicate(
          "review_started_at is null for unreviewed items",
          queueItem.review_started_at === null,
        );
      }

      // Validate submission timestamp exists
      TestValidator.predicate(
        "queue item has submitted_at timestamp",
        queueItem.submitted_at !== undefined &&
          typeof queueItem.submitted_at === "string",
      );

      // Validate priority level
      TestValidator.predicate(
        "queue item has valid priority level",
        ["normal", "high", "low"].includes(queueItem.priority),
      );

      // Validate timestamps are present
      TestValidator.predicate(
        "queue item has created_at timestamp",
        queueItem.created_at !== undefined &&
          typeof queueItem.created_at === "string",
      );
      TestValidator.predicate(
        "queue item has updated_at timestamp",
        queueItem.updated_at !== undefined &&
          typeof queueItem.updated_at === "string",
      );
    }
  }

  // Step 5: Test with priority filter to ensure review status is consistent across filtered results
  const filteredQueueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          priority: "high",
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(filteredQueueResponse);

  // Validate that filtered results also include review status
  if (filteredQueueResponse.data && filteredQueueResponse.data.length > 0) {
    for (const item of filteredQueueResponse.data) {
      TestValidator.predicate(
        "filtered queue item has review_started_at field for workflow tracking",
        item.review_started_at !== undefined,
      );
      TestValidator.equals(
        "filtered item priority matches filter criteria",
        item.priority,
        "high",
      );
    }
  }

  // Step 6: Verify overall response structure and data consistency
  TestValidator.predicate(
    "queue response contains data array",
    Array.isArray(queueResponse.data),
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    queueResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    queueResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page is non-negative",
    queueResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    queueResponse.pagination.limit > 0,
  );
}
