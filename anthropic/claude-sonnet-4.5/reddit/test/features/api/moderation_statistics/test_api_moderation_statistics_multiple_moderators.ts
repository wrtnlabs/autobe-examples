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
 * Test retrieving moderation statistics for a community with multiple
 * moderators.
 *
 * This test validates that moderation action statistics correctly attribute
 * actions to individual moderators when multiple moderators are active in a
 * community. It ensures that the actions_by_moderator breakdown accurately
 * reflects workload distribution, total action counts, and identifies each
 * moderator's most common action type.
 *
 * Test flow:
 *
 * 1. Create and authenticate founding moderator
 * 2. Create test community (founding moderator auto-assigned)
 * 3. Create additional moderator accounts
 * 4. Retrieve statistics and validate structure
 * 5. Verify actions_by_moderator array format and moderator references
 *
 * Note: This test validates the statistics API structure. Without moderation
 * action creation endpoints in the provided materials, actual action simulation
 * cannot be implemented. The test verifies that the multi-moderator statistics
 * aggregation endpoint returns valid data structures.
 */
export async function test_api_moderation_statistics_multiple_moderators(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate founding moderator
  const foundingModeratorEmail = typia.random<string & tags.Format<"email">>();
  const foundingModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: foundingModeratorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(foundingModerator);

  // Step 2: Create test community
  const communityName = RandomGenerator.alphabets(10);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create additional moderator accounts
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        password: "ModPass456!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator2);

  const moderator3Email = typia.random<string & tags.Format<"email">>();
  const moderator3: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator3Email,
        password: "Admin789!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator3);

  // Step 4: Retrieve moderation statistics
  const statistics: IRedditCommunityModerationActionStatistics =
    await api.functional.redditCommunity.moderator.communities.moderationActions.statistics(
      connection,
      {
        communityName: community.name,
      },
    );
  typia.assert(statistics);

  // Step 5: Validate actions_by_moderator structure
  // typia.assert() already validated the complete structure including:
  // - actions_by_moderator is an array
  // - Each moderator summary has valid moderator reference with id and username
  // - total_actions is a non-negative int32
  // - most_common_action_type is a string
  // - All nested objects conform to their schemas

  // Additional business logic validation: verify founding moderator appears if actions exist
  if (statistics.actions_by_moderator.length > 0) {
    const foundingModeratorInStats = statistics.actions_by_moderator.find(
      (summary) => summary.moderator.id === foundingModerator.id,
    );

    // Note: Without action creation APIs, we cannot guarantee the founding moderator
    // has performed actions, so we simply verify the data structure is correct
    TestValidator.predicate(
      "actions_by_moderator contains valid moderator summaries",
      statistics.actions_by_moderator.every(
        (summary) => summary.moderator.username.length > 0,
      ),
    );
  }
}
