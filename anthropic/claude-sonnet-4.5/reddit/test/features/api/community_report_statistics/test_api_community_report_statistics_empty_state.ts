import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatistics";

export async function test_api_community_report_statistics_empty_state(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "testPassword123",
        nickname: RandomGenerator.name(),
        href: "https://test.example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://test.example.com" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new community
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

  // Step 3: Retrieve report statistics immediately (no posts or reports created)
  const statistics: IRedditCommunityReportStatistics =
    await api.functional.redditCommunity.moderator.communities.reports.statistics.at(
      connection,
      {
        communityName: community.name,
      },
    );
  typia.assert(statistics);

  // Step 4: Validate zero-state statistics
  TestValidator.equals(
    "total_reports should be 0",
    statistics.total_reports,
    0,
  );
  TestValidator.equals(
    "pending_reports should be 0",
    statistics.pending_reports,
    0,
  );
  TestValidator.equals(
    "resolved_reports should be 0",
    statistics.resolved_reports,
    0,
  );
  TestValidator.equals(
    "dismissed_reports should be 0",
    statistics.dismissed_reports,
    0,
  );
  TestValidator.equals(
    "post_reports_count should be 0",
    statistics.post_reports_count,
    0,
  );
  TestValidator.equals(
    "comment_reports_count should be 0",
    statistics.comment_reports_count,
    0,
  );
  TestValidator.equals(
    "unique_reporters should be 0",
    statistics.unique_reporters,
    0,
  );
  TestValidator.equals(
    "repeat_offenders should be 0",
    statistics.repeat_offenders,
    0,
  );
  TestValidator.equals(
    "reports_last_24h should be 0",
    statistics.reports_last_24h,
    0,
  );
  TestValidator.equals(
    "reports_last_7d should be 0",
    statistics.reports_last_7d,
    0,
  );
  TestValidator.equals(
    "reports_last_30d should be 0",
    statistics.reports_last_30d,
    0,
  );

  // Validate null values for fields that require report data
  TestValidator.equals(
    "average_resolution_time_hours should be null",
    statistics.average_resolution_time_hours,
    null,
  );
  TestValidator.equals(
    "most_common_violation should be null",
    statistics.most_common_violation,
    null,
  );

  // Validate reports_by_category is an empty object
  TestValidator.equals(
    "reports_by_category should be empty",
    Object.keys(statistics.reports_by_category).length,
    0,
  );
}
