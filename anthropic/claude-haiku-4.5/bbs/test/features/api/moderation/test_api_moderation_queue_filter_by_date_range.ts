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
 * Test filtering moderation queue by submission date range.
 *
 * This test validates that the moderation queue API correctly filters articles
 * based on their submission date range. A moderator authenticates, then
 * requests queue items with specific date range filters (submitted_date_from
 * and submitted_date_to) to retrieve only articles submitted within the
 * specified time window.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Request moderation queue with date range filters
 * 3. Validate all returned items fall within the date range (inclusive)
 * 4. Validate pagination works correctly with date-filtered results
 * 5. Test with multiple date ranges to ensure filtering accuracy
 */
export async function test_api_moderation_queue_filter_by_date_range(
  connection: api.IConnection,
) {
  // 1. Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Test@Password123";
  const moderatorUsername = RandomGenerator.alphabets(8);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate("moderator created successfully", !!moderator.id);

  // 2. Request moderation queue with date range filters
  // Set up date range: from 30 days ago to now
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const submittedDateFrom = thirtyDaysAgo.toISOString();
  const submittedDateTo = now.toISOString();

  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          submitted_date_from: submittedDateFrom,
          submitted_date_to: submittedDateTo,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // 3. Validate all returned items fall within the date range (inclusive)
  TestValidator.predicate(
    "queue response contains pagination info",
    !!queueResponse.pagination,
  );

  if (queueResponse.data.length > 0) {
    // Check that all returned items have submitted_at within the date range
    for (const item of queueResponse.data) {
      const itemSubmittedAt = new Date(item.submitted_at);
      TestValidator.predicate(
        `item submitted_at is within date range`,
        itemSubmittedAt >= thirtyDaysAgo && itemSubmittedAt <= now,
      );
    }

    TestValidator.predicate(
      "queue data contains items",
      queueResponse.data.length > 0,
    );
  }

  // 4. Validate pagination works correctly with date-filtered results
  TestValidator.predicate(
    "pagination current page is valid",
    queueResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    queueResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records count is non-negative",
    queueResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    queueResponse.pagination.pages >= 0,
  );

  // 5. Test with alternative date range (recent 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentQueueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          submitted_date_from: sevenDaysAgo.toISOString(),
          submitted_date_to: now.toISOString(),
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(recentQueueResponse);

  // Validate items in recent queue are within the 7-day range
  if (recentQueueResponse.data.length > 0) {
    for (const item of recentQueueResponse.data) {
      const itemSubmittedAt = new Date(item.submitted_at);
      TestValidator.predicate(
        `recent item submitted_at is within 7-day range`,
        itemSubmittedAt >= sevenDaysAgo && itemSubmittedAt <= now,
      );
    }
  }

  // Test with very specific narrow date range (1 hour window)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const narrowRangeResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          submitted_date_from: oneHourAgo.toISOString(),
          submitted_date_to: now.toISOString(),
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(narrowRangeResponse);

  TestValidator.predicate(
    "narrow date range response is valid",
    !!narrowRangeResponse.pagination,
  );
}
