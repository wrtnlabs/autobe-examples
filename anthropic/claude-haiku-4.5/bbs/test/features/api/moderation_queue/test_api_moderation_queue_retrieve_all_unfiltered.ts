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
 * Test retrieving the complete moderation queue without any filters.
 *
 * This test validates that a moderator can retrieve all pending articles
 * awaiting review from the moderation queue with no filtering applied. The
 * baseline scenario confirms:
 *
 * 1. Moderator registration and authentication
 * 2. Queue retrieval without any filter parameters
 * 3. Complete paginated response with all queue items
 * 4. Correct pagination metadata (page, limit, total records, total pages)
 * 5. Queue items contain all required fields: ID, article reference, contributor
 *    reference, submission timestamp, priority level, assigned moderator,
 *    review status
 * 6. Default sorting order (oldest submissions first - submitted_at ascending)
 *
 * This foundational test ensures the core queue retrieval functionality works
 * correctly before testing advanced filtering and sorting features.
 */
export async function test_api_moderation_queue_retrieve_all_unfiltered(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Verify moderator was created with correct properties
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator account is active",
    moderator.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator has full permissions",
    moderator.moderation_tier,
    "full",
  );

  // Step 2: Retrieve complete moderation queue without filters
  // This tests the baseline queue retrieval with no filtering parameters
  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // Step 3: Validate pagination metadata
  const pagination: IPage.IPagination = queueResponse.pagination;
  typia.assert(pagination);

  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is valid", pagination.limit >= 0);
  TestValidator.predicate(
    "total records count is valid",
    pagination.records >= 0,
  );
  TestValidator.predicate("total pages is valid", pagination.pages >= 0);

  // Verify pagination consistency
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "calculated pages matches returned pages",
      pagination.pages,
      expectedPages,
    );
  }

  // Step 4: Validate queue items array structure
  const queueItems: IDiscussionBoardModerationQueue.ISummary[] =
    queueResponse.data;
  typia.assert(queueItems);

  // Step 5: If queue has items, validate each item's structure
  if (queueItems.length > 0) {
    // Validate first queue item contains all required fields
    const firstItem: IDiscussionBoardModerationQueue.ISummary = queueItems[0];
    typia.assert(firstItem);

    // Verify queue item has required UUID fields
    const uuidPattern = new RegExp(
      "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
      "i",
    );
    TestValidator.predicate(
      "queue item has valid ID",
      uuidPattern.test(firstItem.id),
    );
    TestValidator.predicate(
      "queue item references valid article ID",
      uuidPattern.test(firstItem.discussion_board_article_id),
    );
    TestValidator.predicate(
      "queue item references valid contributor ID",
      uuidPattern.test(firstItem.discussion_board_contributor_id),
    );

    // Verify priority is one of valid values
    TestValidator.predicate(
      "queue item priority is valid",
      ["normal", "high", "low"].includes(firstItem.priority),
    );

    // Verify timestamps are valid ISO 8601 format
    TestValidator.predicate(
      "submitted_at is valid ISO date",
      !isNaN(new Date(firstItem.submitted_at).getTime()),
    );
    TestValidator.predicate(
      "created_at is valid ISO date",
      !isNaN(new Date(firstItem.created_at).getTime()),
    );
    TestValidator.predicate(
      "updated_at is valid ISO date",
      !isNaN(new Date(firstItem.updated_at).getTime()),
    );

    // Verify optional review_started_at is either null or valid date
    if (firstItem.review_started_at !== null) {
      TestValidator.predicate(
        "review_started_at is valid ISO date when present",
        !isNaN(new Date(firstItem.review_started_at).getTime()),
      );
    }

    // Verify assigned_moderator_id is either null or valid UUID
    if (firstItem.assigned_moderator_id !== null) {
      TestValidator.predicate(
        "assigned_moderator_id is valid UUID when assigned",
        uuidPattern.test(firstItem.assigned_moderator_id),
      );
    }

    // Verify optional submission_notes field
    if (firstItem.submission_notes !== null) {
      TestValidator.predicate(
        "submission_notes is valid string when present",
        typeof firstItem.submission_notes === "string",
      );
      TestValidator.predicate(
        "submission_notes does not exceed max length",
        firstItem.submission_notes.length <= 1000,
      );
    }

    // Step 6: Verify default sorting order (oldest first)
    // When no sorting parameters specified, items should be sorted by submitted_at ascending
    if (queueItems.length > 1) {
      for (let i = 1; i < Math.min(5, queueItems.length); i++) {
        const prevDate = new Date(queueItems[i - 1].submitted_at).getTime();
        const currDate = new Date(queueItems[i].submitted_at).getTime();
        TestValidator.predicate(
          `item ${i - 1} submitted_at <= item ${i} submitted_at (FIFO order)`,
          prevDate <= currDate,
        );
      }
    }
  }

  // Step 7: Verify response contains expected structure
  TestValidator.predicate(
    "response has pagination object",
    queueResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(queueResponse.data),
  );
}
