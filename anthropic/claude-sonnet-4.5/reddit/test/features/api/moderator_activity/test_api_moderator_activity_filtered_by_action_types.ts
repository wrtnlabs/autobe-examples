import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

/**
 * Test filtering moderator activity history by specific action types.
 *
 * This test validates the action_types filter parameter of the moderator
 * activity retrieval endpoint. It verifies that the API correctly accepts
 * action type filters and returns properly structured paginated responses.
 *
 * Test steps:
 *
 * 1. Create a moderator account for testing
 * 2. Query activity with single action type filter
 * 3. Query activity with multiple action types filter
 * 4. Validate response structure and pagination metadata
 * 5. Verify that only actions matching filter types would be returned (if any
 *    exist)
 */
export async function test_api_moderator_activity_filtered_by_action_types(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test filtering by single action type
  const singleTypeFilter: (
    | "post_removal"
    | "comment_removal"
    | "user_ban"
    | "user_unban"
    | "report_resolution"
    | "post_approval"
    | "comment_approval"
    | "rule_creation"
    | "rule_modification"
    | "rule_deletion"
  )[] = ["post_removal"];
  const singleTypeResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {
          page: 1,
          limit: 20,
          action_types: singleTypeFilter,
        } satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(singleTypeResult);

  // Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current page should be non-negative",
    singleTypeResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    singleTypeResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    singleTypeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    singleTypeResult.pagination.pages >= 0,
  );

  // Verify all returned actions match the requested type (if any data exists)
  if (singleTypeResult.data.length > 0) {
    for (const action of singleTypeResult.data) {
      TestValidator.equals(
        "action type should match single filter",
        action.action_type,
        "post_removal",
      );
    }
  }

  // Step 3: Test filtering by multiple action types
  const multipleTypesFilter: (
    | "post_removal"
    | "comment_removal"
    | "user_ban"
    | "user_unban"
    | "report_resolution"
    | "post_approval"
    | "comment_approval"
    | "rule_creation"
    | "rule_modification"
    | "rule_deletion"
  )[] = ["post_removal", "comment_removal", "user_ban"];
  const multipleTypesResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {
          page: 1,
          limit: 20,
          action_types: multipleTypesFilter,
        } satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(multipleTypesResult);

  // Verify response structure
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(multipleTypesResult.data),
  );

  // Verify all returned actions match one of the requested types (if any data exists)
  if (multipleTypesResult.data.length > 0) {
    for (const action of multipleTypesResult.data) {
      const isValidType = multipleTypesFilter.includes(
        action.action_type as (typeof multipleTypesFilter)[number],
      );
      TestValidator.predicate(
        "action type should match one of multiple filters",
        isValidType,
      );
    }
  }

  // Step 4: Test with different action type combination
  const reportResolutionFilter: (
    | "post_removal"
    | "comment_removal"
    | "user_ban"
    | "user_unban"
    | "report_resolution"
    | "post_approval"
    | "comment_approval"
    | "rule_creation"
    | "rule_modification"
    | "rule_deletion"
  )[] = ["report_resolution", "post_approval"];
  const reportResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {
          page: 1,
          limit: 10,
          action_types: reportResolutionFilter,
        } satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(reportResult);

  // Verify pagination limit matches request
  TestValidator.equals(
    "pagination limit should match request",
    reportResult.pagination.limit,
    10,
  );

  // Verify filtering works correctly for this combination (if any data exists)
  if (reportResult.data.length > 0) {
    for (const action of reportResult.data) {
      const matchesFilter = reportResolutionFilter.includes(
        action.action_type as (typeof reportResolutionFilter)[number],
      );
      TestValidator.predicate(
        "action type should match report resolution filter",
        matchesFilter,
      );
    }
  }
}
