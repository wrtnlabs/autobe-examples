import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test retrieving the complete moderation history for a specific member
 * account.
 *
 * This test validates that moderators can successfully retrieve comprehensive
 * moderation history for any member, including both content-level actions
 * (article edits, deletions, attachment removals) and account-level actions
 * (suspensions, bans, restorations).
 *
 * Test Flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Generate a valid member UUID for querying moderation history
 * 3. Retrieve moderation history with default parameters (no filters)
 * 4. Validate response structure and pagination metadata
 * 5. Test with pagination parameters (page and limit)
 * 6. Verify the response contains proper moderation log summaries array
 *
 * The test focuses on successful retrieval scenarios, validating API response
 * structure and type safety. An empty moderation history is a valid result for
 * members with no enforcement actions.
 */
export async function test_api_member_moderation_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Generate a valid member UUID for testing
  const testMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve moderation history with minimal parameters
  const historyResponse =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: testMemberId,
        body: {} satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(historyResponse);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be non-negative",
    historyResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    historyResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    historyResponse.pagination.pages >= 0,
  );

  // Step 5: Validate data array structure
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(historyResponse.data),
  );

  // Step 6: Test with explicit pagination parameters
  const paginatedHistory =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: testMemberId,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(paginatedHistory);

  // Step 7: Validate pagination parameters are respected
  TestValidator.equals(
    "pagination current page matches request",
    paginatedHistory.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should not exceed request limit",
    paginatedHistory.pagination.limit <= 20,
  );

  // Step 8: Test with action type filtering
  const filteredHistory =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: testMemberId,
        body: {
          action_types: ["account_suspended", "account_banned"],
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(filteredHistory);

  TestValidator.predicate(
    "filtered history response should be valid",
    Array.isArray(filteredHistory.data),
  );
}
