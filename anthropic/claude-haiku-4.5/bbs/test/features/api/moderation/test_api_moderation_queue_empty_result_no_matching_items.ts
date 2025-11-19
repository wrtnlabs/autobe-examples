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
 * Test moderation queue retrieval with filters matching no items.
 *
 * This test validates the moderation queue API's ability to gracefully handle
 * scenarios where applied filters match no articles. The moderator
 * authenticates, then requests the queue with a date filter set to a future
 * date range that guarantees no matching articles exist. The API should return
 * an empty data array while maintaining valid pagination metadata (records=0,
 * pages=0).
 *
 * This ensures the system correctly handles zero-result scenarios without
 * errors and provides consistent pagination structure even when no items are
 * found.
 *
 * Workflow:
 *
 * 1. Create moderator account through join endpoint
 * 2. Query moderation queue with future date range filter (no matches expected)
 * 3. Verify response contains empty data array
 * 4. Validate pagination metadata shows records=0 and pages=0
 * 5. Verify pagination structure is complete and valid
 */
export async function test_api_moderation_queue_empty_result_no_matching_items(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const password =
    RandomGenerator.alphabets(5) + "Aa1!" + RandomGenerator.alphabets(3);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: password,
        username: RandomGenerator.alphaNumeric(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Query moderation queue with future date range (no matches expected)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          submitted_date_from: new Date().toISOString(),
          submitted_date_to: futureDate.toISOString(),
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // 3. Verify response contains empty data array
  TestValidator.equals(
    "queue data should be empty array",
    queueResponse.data,
    [],
  );

  // 4. Validate pagination metadata shows records=0 and pages=0
  TestValidator.equals(
    "pagination records should be zero",
    queueResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero",
    queueResponse.pagination.pages,
    0,
  );

  // 5. Verify pagination structure is complete and valid
  TestValidator.predicate(
    "pagination current page should be valid",
    queueResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    queueResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination object should have all required fields",
    queueResponse.pagination.current !== undefined &&
      queueResponse.pagination.limit !== undefined &&
      queueResponse.pagination.records !== undefined &&
      queueResponse.pagination.pages !== undefined,
  );
}
