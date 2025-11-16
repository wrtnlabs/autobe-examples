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
 * Test filtering moderation actions by action type.
 *
 * This test validates that moderators can search for moderation actions with
 * action_type filter specified (e.g., 'remove_post', 'ban_user',
 * 'resolve_report'). It verifies that the filter correctly categorizes and
 * returns only actions matching the specified type, and that different action
 * types can be filtered independently.
 *
 * Test Steps:
 *
 * 1. Authenticate as a moderator
 * 2. Search moderation actions with specific action_type filter
 * 3. Validate that all returned actions match the specified action_type
 * 4. Test filtering with different action types to ensure independence
 * 5. Verify pagination metadata is correctly structured
 */
export async function test_api_moderation_actions_filter_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Define action types to test
  const actionTypes = ["remove_post", "ban_user", "resolve_report"] as const;

  // Step 3: Test filtering for each action type
  for (const actionType of actionTypes) {
    const filteredResults =
      await api.functional.redditCommunity.moderator.moderationActions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 20,
            action_type: actionType,
          } satisfies IRedditCommunityModerationAction.IRequest,
        },
      );
    typia.assert(filteredResults);

    // Step 4: Validate pagination structure
    TestValidator.predicate(
      "pagination should have valid structure",
      filteredResults.pagination.current >= 0 &&
        filteredResults.pagination.limit > 0 &&
        filteredResults.pagination.records >= 0 &&
        filteredResults.pagination.pages >= 0,
    );

    // Step 5: Validate all returned actions match the specified action_type
    for (const action of filteredResults.data) {
      TestValidator.equals(
        `action_type should match filter: ${actionType}`,
        action.action_type,
        actionType,
      );
    }

    // Step 6: Verify data array length respects limit
    TestValidator.predicate(
      "data array length should not exceed limit",
      filteredResults.data.length <= filteredResults.pagination.limit,
    );
  }

  // Step 7: Test with null action_type (should return all types)
  const allActionsResult =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          action_type: null,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(allActionsResult);

  // Step 8: Validate that null filter returns results (if any exist)
  TestValidator.predicate(
    "pagination metadata should be valid for unfiltered search",
    allActionsResult.pagination.current >= 0 &&
      allActionsResult.pagination.pages >= 0,
  );
}
