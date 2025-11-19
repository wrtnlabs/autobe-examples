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
 * Test moderation queue with multiple filters applied simultaneously.
 *
 * This test validates the moderator's ability to filter the moderation queue
 * using multiple criteria combined with AND logic. The moderator authenticates
 * and requests queue items filtered by:
 *
 * - Priority='high' (urgent items requiring immediate attention)
 * - Assigned_moderator_id=null (unassigned items waiting for moderator pickup)
 * - Submitted_date_from=<recent_date> (recently submitted articles)
 *
 * The system returns only articles matching ALL filter criteria simultaneously,
 * representing the most urgent unreviewed work. This test ensures the
 * moderation queue filtering system correctly combines multiple constraints and
 * returns accurate results for realistic moderator workflows.
 *
 * Workflow steps:
 *
 * 1. Register a new moderator account
 * 2. Request filtered queue with all three filter criteria
 * 3. Validate each returned item matches all filter conditions
 * 4. Confirm filter logic operates correctly with AND semantics
 */
export async function test_api_moderation_queue_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request moderation queue with combined filters
  // Use a date that captures recently submitted items (within last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const submittedDateFrom = thirtyDaysAgo.toISOString();

  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          priority: "high",
          assigned_moderator_id: null,
          submitted_date_from: submittedDateFrom,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // Step 3: Validate all returned items match the combined filter criteria
  TestValidator.predicate(
    "queue returns valid pagination structure",
    () =>
      queueResponse.pagination &&
      queueResponse.pagination.current > 0 &&
      queueResponse.pagination.limit > 0,
  );

  if (queueResponse.data.length > 0) {
    // Validate each queue item matches ALL filter criteria
    queueResponse.data.forEach((queueItem, index) => {
      TestValidator.equals(
        `queue item ${index} has priority 'high'`,
        queueItem.priority,
        "high",
      );

      TestValidator.equals(
        `queue item ${index} is unassigned (assigned_moderator_id is null)`,
        queueItem.assigned_moderator_id,
        null,
      );

      TestValidator.predicate(
        `queue item ${index} was submitted on or after the filter date`,
        () => {
          const itemSubmittedTime = new Date(queueItem.submitted_at).getTime();
          const filterStartTime = new Date(submittedDateFrom).getTime();
          return itemSubmittedTime >= filterStartTime;
        },
      );

      TestValidator.predicate(
        `queue item ${index} has valid queue item structure`,
        () =>
          queueItem.id &&
          queueItem.discussion_board_article_id &&
          queueItem.discussion_board_contributor_id &&
          queueItem.submitted_at &&
          typeof queueItem.priority === "string",
      );
    });

    // Step 4: Confirm multiple filters work together with AND logic
    TestValidator.predicate(
      "all queue items satisfy combined filter criteria with AND logic",
      () =>
        queueResponse.data.every(
          (item) =>
            item.priority === "high" &&
            item.assigned_moderator_id === null &&
            new Date(item.submitted_at).getTime() >=
              new Date(submittedDateFrom).getTime(),
        ),
    );
  } else {
    // Even with no results, pagination should be valid
    TestValidator.predicate(
      "pagination is valid even with no filtered results",
      () =>
        queueResponse.pagination &&
        queueResponse.pagination.records === 0 &&
        queueResponse.pagination.pages === 0,
    );
  }
}
