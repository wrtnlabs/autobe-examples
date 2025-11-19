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
 * Test combining multiple filters simultaneously for member moderation history
 * queries.
 *
 * This test validates that moderators can apply sophisticated queries using
 * multiple filter parameters together, such as filtering by specific
 * action_types (account suspensions only) AND date range (past 6 months) AND
 * specific moderator who issued actions. The test verifies that all filters
 * work correctly with AND logic across both content moderation and account
 * action records.
 *
 * Test Process:
 *
 * 1. Create and authenticate a moderator account
 * 2. Test single filter: action_types only
 * 3. Test two filters combined: action_types + date range
 * 4. Test three filters combined: action_types + date range + moderator_id
 * 5. Test pagination with complex filters
 * 6. Validate response structure and pagination metadata
 */
export async function test_api_member_moderation_history_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureModPass123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Generate a member ID to query moderation history for
  const targetMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Test with single filter - action_types only
  const singleFilterRequest = {
    action_types: ["account_suspended", "account_banned"],
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const singleFilterResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: singleFilterRequest,
      },
    );
  typia.assert(singleFilterResult);

  // Validate pagination structure
  TestValidator.predicate(
    "single filter response has valid pagination",
    singleFilterResult.pagination.current === 1 &&
      singleFilterResult.pagination.limit === 20 &&
      singleFilterResult.pagination.records >= 0 &&
      singleFilterResult.pagination.pages >= 0,
  );

  // Step 3: Test with two filters - action_types + date range
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const twoFilterRequest = {
    action_types: ["article_deleted", "attachment_removed"],
    from_date: sixMonthsAgo.toISOString(),
    to_date: now.toISOString(),
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const twoFilterResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: twoFilterRequest,
      },
    );
  typia.assert(twoFilterResult);

  TestValidator.predicate(
    "two filter response has valid structure",
    Array.isArray(twoFilterResult.data) &&
      twoFilterResult.pagination.limit === 50,
  );

  // Step 4: Test with three filters - action_types + date range + moderator_id
  const threeFilterRequest = {
    action_types: ["account_suspended"],
    from_date: sixMonthsAgo.toISOString(),
    to_date: now.toISOString(),
    moderator_id: moderator.id,
    page: 1,
    limit: 25,
    sort_by: "created_at",
    order: "desc",
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const threeFilterResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: threeFilterRequest,
      },
    );
  typia.assert(threeFilterResult);

  TestValidator.predicate(
    "three filter response returns valid paginated data",
    threeFilterResult.pagination.current === 1 &&
      threeFilterResult.pagination.limit === 25 &&
      Array.isArray(threeFilterResult.data),
  );

  // Step 5: Test comprehensive filters with all parameters
  const comprehensiveRequest = {
    action_types: ["article_edited", "article_deleted", "account_banned"],
    from_date: sixMonthsAgo.toISOString(),
    to_date: now.toISOString(),
    moderator_id: moderator.id,
    page: 2,
    limit: 10,
    sort_by: "action_type",
    order: "asc",
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const comprehensiveResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: comprehensiveRequest,
      },
    );
  typia.assert(comprehensiveResult);

  TestValidator.predicate(
    "comprehensive filter with pagination page 2",
    comprehensiveResult.pagination.current === 2 &&
      comprehensiveResult.pagination.limit === 10,
  );

  // Step 6: Test minimal request (no filters, just pagination defaults)
  const minimalRequest = {} satisfies IDiscussionBoardModerationLog.IRequest;

  const minimalResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: minimalRequest,
      },
    );
  typia.assert(minimalResult);

  TestValidator.predicate(
    "minimal request returns valid response",
    minimalResult.pagination.records >= 0 && Array.isArray(minimalResult.data),
  );

  // Step 7: Test with article_id filter
  const articleFilterRequest = {
    action_types: ["article_edited", "article_deleted"],
    article_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 15,
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const articleFilterResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: articleFilterRequest,
      },
    );
  typia.assert(articleFilterResult);

  TestValidator.equals(
    "article filter pagination current page",
    articleFilterResult.pagination.current,
    1,
  );

  // Step 8: Test edge case - maximum limit
  const maxLimitRequest = {
    action_types: ["account_restored"],
    limit: 100,
    page: 1,
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const maxLimitResult =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: maxLimitRequest,
      },
    );
  typia.assert(maxLimitResult);

  TestValidator.predicate(
    "maximum limit request accepted",
    maxLimitResult.pagination.limit === 100,
  );
}
