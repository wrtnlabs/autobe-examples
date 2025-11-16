import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationActionStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionStatistics";
import type { IRedditCommunityModerationActionTypeBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionTypeBreakdown";
import type { IRedditCommunityModerationReasonCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationReasonCount";
import type { IRedditCommunityModerationTemporalTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationTemporalTrends";
import type { IRedditCommunityModeratorActionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorActionSummary";

/**
 * Test retrieving moderation action statistics for a newly created community
 * with no moderation actions.
 *
 * This test validates that the statistics endpoint returns properly structured
 * zero-count statistics when no moderation activity has occurred. It ensures
 * the aggregation logic handles empty datasets gracefully and returns valid,
 * well-formed statistical responses rather than errors or null values.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a new community with no moderation actions
 * 3. Retrieve moderation statistics for the community
 * 4. Validate that all statistical fields are initialized correctly with zero
 *    values
 */
export async function test_api_moderation_statistics_empty_community(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a new community (with no moderation actions)
  const communityData = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Retrieve moderation statistics for the newly created community
  const statistics: IRedditCommunityModerationActionStatistics =
    await api.functional.redditCommunity.moderator.communities.moderationActions.statistics(
      connection,
      {
        communityName: community.name,
      },
    );
  typia.assert(statistics);

  // Step 4: Validate that all statistical fields are properly initialized with zero values

  // Validate total_actions is 0
  TestValidator.equals(
    "total_actions should be 0 for new community",
    statistics.total_actions,
    0,
  );

  // Validate all action type counts are 0
  TestValidator.equals(
    "remove_post count should be 0",
    statistics.actions_by_type.remove_post,
    0,
  );
  TestValidator.equals(
    "remove_comment count should be 0",
    statistics.actions_by_type.remove_comment,
    0,
  );
  TestValidator.equals(
    "ban_user count should be 0",
    statistics.actions_by_type.ban_user,
    0,
  );
  TestValidator.equals(
    "resolve_report count should be 0",
    statistics.actions_by_type.resolve_report,
    0,
  );
  TestValidator.equals(
    "warn_user count should be 0",
    statistics.actions_by_type.warn_user,
    0,
  );
  TestValidator.equals(
    "approve_content count should be 0",
    statistics.actions_by_type.approve_content,
    0,
  );
  TestValidator.equals(
    "other action count should be 0",
    statistics.actions_by_type.other,
    0,
  );

  // Validate actions_by_moderator is an empty array
  TestValidator.equals(
    "actions_by_moderator should be empty array",
    statistics.actions_by_moderator.length,
    0,
  );

  // Validate temporal trends show 0 for all time periods
  TestValidator.equals(
    "actions_last_24_hours should be 0",
    statistics.temporal_trends.actions_last_24_hours,
    0,
  );
  TestValidator.equals(
    "actions_last_7_days should be 0",
    statistics.temporal_trends.actions_last_7_days,
    0,
  );
  TestValidator.equals(
    "actions_last_30_days should be 0",
    statistics.temporal_trends.actions_last_30_days,
    0,
  );
  TestValidator.equals(
    "daily_average should be 0",
    statistics.temporal_trends.daily_average,
    0,
  );

  // Validate most_common_reasons is an empty array
  TestValidator.equals(
    "most_common_reasons should be empty array",
    statistics.most_common_reasons.length,
    0,
  );
}
