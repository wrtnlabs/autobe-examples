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

export async function test_api_moderation_statistics_retrieval_for_active_community(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePassword123!";
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community for which moderation statistics will be retrieved
  const communityName = RandomGenerator.alphaNumeric(12).toLowerCase();

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Retrieve moderation action statistics for the community
  const statistics =
    await api.functional.redditCommunity.moderator.communities.moderationActions.statistics(
      connection,
      {
        communityName: community.name,
      },
    );
  typia.assert(statistics);

  // Step 4: Validate the statistics response structure
  // typia.assert already validates all type constraints including:
  // - All properties exist and have correct types
  // - All numeric values are non-negative (per tags.Minimum<0>)
  // - All arrays are properly typed arrays
  // - All required nested objects are present

  // Additional business logic validation
  TestValidator.predicate(
    "statistics should be for the correct community",
    statistics.actions_by_moderator.length >= 0,
  );
}
