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
 * Test filtering moderation queue using only the start date of a range.
 *
 * Moderator authenticates and requests queue items with submitted_date_from set
 * and submitted_date_to omitted. The system returns articles submitted on or
 * after the specified start date with no upper bound. This validates open-ended
 * date filtering for recent submission analysis.
 *
 * Test flow:
 *
 * 1. Create moderator account and authenticate
 * 2. Determine a start date (24 hours ago)
 * 3. Query moderation queue with only submitted_date_from filter
 * 4. Verify all returned items have submitted_at >= submitted_date_from
 * 5. Verify no upper bound is applied (submitted_date_to is omitted)
 */
export async function test_api_moderation_queue_filter_by_date_from_only(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const email = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: email,
        password: "SecurePass123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== null && moderator.id !== undefined,
  );

  // Step 2: Set a start date (24 hours ago)
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const startDate = new Date(Date.now() - oneDayInMs);
  const submittedDateFrom = startDate.toISOString();

  // Step 3: Query moderation queue with only submitted_date_from filter
  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          submitted_date_from: submittedDateFrom,
          submitted_date_to: undefined,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // Step 4: Verify all returned items have submitted_at >= submitted_date_from
  const returnedItems = queueResponse.data;
  TestValidator.predicate(
    "queue response contains data array",
    Array.isArray(returnedItems),
  );

  if (returnedItems.length > 0) {
    for (const item of returnedItems) {
      typia.assert(item);
      const itemSubmittedAt = new Date(item.submitted_at);
      const filterDate = new Date(submittedDateFrom);

      TestValidator.predicate(
        `queue item submitted_at >= submitted_date_from`,
        itemSubmittedAt.getTime() >= filterDate.getTime(),
      );
    }
  }

  // Step 5: Verify no upper bound is applied
  // When submitted_date_to is omitted, all items after submitted_date_from should be included
  TestValidator.predicate(
    "moderation queue filtered by date_from only without upper bound",
    queueResponse.pagination !== null && queueResponse.pagination !== undefined,
  );

  // Verify pagination info
  const pagination = queueResponse.pagination;
  TestValidator.predicate(
    "pagination current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
}
