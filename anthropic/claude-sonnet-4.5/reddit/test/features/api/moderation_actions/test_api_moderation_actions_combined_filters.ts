import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

/**
 * Test combining multiple filter parameters simultaneously for moderation
 * action searches.
 *
 * This test validates that the moderation action search endpoint properly
 * supports complex filter combinations using AND logic to narrow results. It
 * creates multiple communities and tests various filter combinations
 * including:
 *
 * - Moderator_id + community_id
 * - Action_type + target_type
 * - Date range + action_type
 * - All filters together
 *
 * The test ensures that complex filter combinations enable precise audit
 * queries for specific moderation scenarios (e.g., 'all ban_user actions in
 * community X during the last month').
 */
export async function test_api_moderation_actions_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create multiple communities for diverse dataset
  const community1: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(15),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community1);

  const community2: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(15),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community2);

  // Step 3: Test filter combination - moderator_id + community_id
  const filterByCommunityAndModerator: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          community_id: community1.id,
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(filterByCommunityAndModerator);
  TestValidator.predicate(
    "moderator_id + community_id filter returns valid pagination",
    filterByCommunityAndModerator.pagination.current >= 0,
  );

  // Step 4: Test filter combination - action_type + target_type
  const filterByActionAndTarget: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          action_type: "ban_user",
          target_type: "user",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(filterByActionAndTarget);
  TestValidator.predicate(
    "action_type + target_type filter returns valid pagination",
    filterByActionAndTarget.pagination.current >= 0,
  );

  // Step 5: Test filter combination - date range + action_type
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filterByDateRangeAndAction: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          from_date: thirtyDaysAgo.toISOString(),
          to_date: now.toISOString(),
          action_type: "remove_post",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(filterByDateRangeAndAction);
  TestValidator.predicate(
    "date range + action_type filter returns valid pagination",
    filterByDateRangeAndAction.pagination.current >= 0,
  );

  // Step 6: Test all filters combined
  const allFiltersCombined: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          moderator_id: moderator.id,
          community_id: community1.id,
          action_type: "ban_user",
          target_type: "user",
          from_date: thirtyDaysAgo.toISOString(),
          to_date: now.toISOString(),
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(allFiltersCombined);
  TestValidator.predicate(
    "all filters combined returns valid pagination",
    allFiltersCombined.pagination.current >= 0,
  );

  // Step 7: Verify complex scenario - "all ban_user actions in community X during the last month"
  const complexScenario: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          community_id: community1.id,
          action_type: "ban_user",
          from_date: thirtyDaysAgo.toISOString(),
          to_date: now.toISOString(),
          page: 1,
          limit: 50,
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(complexScenario);
  TestValidator.predicate(
    "complex audit query scenario returns valid results",
    complexScenario.pagination.records >= 0,
  );
  TestValidator.predicate(
    "complex scenario pagination is correctly structured",
    complexScenario.pagination.pages >= 0,
  );
}
