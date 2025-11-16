import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatistics";

/**
 * Test report statistics retrieval when reports span multiple violation
 * categories, validating that the reports_by_category breakdown correctly
 * aggregates counts across different violation types and identifies the most
 * common violation.
 *
 * Workflow:
 *
 * 1. Create moderator account and establish authentication
 * 2. Create a test community
 * 3. Create multiple member accounts for content creation and reporting
 * 4. Create several posts in the community
 * 5. Submit reports across diverse categories: multiple spam reports, several
 *    harassment reports, a few misinformation reports, and single instances of
 *    other categories
 * 6. Retrieve statistics and verify category breakdown
 *
 * Validation points:
 *
 * - Reports_by_category contains entries for all submitted violation categories
 * - Each category count matches the number of reports filed under that category
 * - Most_common_violation correctly identifies the category with the highest
 *   count
 * - Total_reports equals the sum of all category counts
 * - Post_reports_count reflects all submitted reports
 */
export async function test_api_community_report_statistics_with_multiple_categories(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: moderatorPassword,
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create test community
  const communityData = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple member accounts
  const memberCount = 5;
  const members: Array<{
    member: IRedditCommunityGuest.IAuthorized;
    password: string;
  }> = [];

  for (let i = 0; i < memberCount; i++) {
    const memberPassword = typia.random<string & tags.MinLength<8>>();
    const memberData = {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberData,
    });
    typia.assert(member);
    members.push({ member, password: memberPassword });
  }

  // Step 4: Create several posts in the community
  const postCount = 10;
  const posts: IRedditCommunityPost[] = [];

  for (let i = 0; i < postCount; i++) {
    const memberIndex = i % memberCount;
    await api.functional.auth.member.login(connection, {
      body: {
        email: members[memberIndex].member.email,
        password: members[memberIndex].password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ILogin,
    });

    const postData = {
      community_id: community.id,
      title: RandomGenerator.paragraph({ sentences: 2 }),
      post_type: "text" as const,
      body: RandomGenerator.content({ paragraphs: 3 }),
    } satisfies IRedditCommunityPost.ICreate;

    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: postData,
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  // Step 5: Submit reports across diverse categories
  const reportCategories = {
    spam: 5,
    harassment: 3,
    misinformation: 2,
    hate_speech: 1,
    violence: 1,
  };

  let totalReportsSubmitted = 0;
  const categoryReportCounts: Record<string, number> = {};

  for (const [category, count] of Object.entries(reportCategories)) {
    for (let i = 0; i < count; i++) {
      const reporterIndex = totalReportsSubmitted % memberCount;
      const postIndex = totalReportsSubmitted % postCount;

      await api.functional.auth.member.login(connection, {
        body: {
          email: members[reporterIndex].member.email,
          password: members[reporterIndex].password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ILogin,
      });

      const reportData = {
        content_type: "post" as const,
        target_content_id: posts[postIndex].id,
        reddit_community_community_id: community.id,
        category: category as
          | "spam"
          | "harassment"
          | "hate_speech"
          | "misinformation"
          | "sexual_content"
          | "violence"
          | "personal_information"
          | "copyright"
          | "self_harm"
          | "other",
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCommunityReport.ICreate;

      const report =
        await api.functional.redditCommunity.member.posts.reports.create(
          connection,
          {
            postId: posts[postIndex].id,
            body: reportData,
          },
        );
      typia.assert(report);

      categoryReportCounts[category] =
        (categoryReportCounts[category] || 0) + 1;
      totalReportsSubmitted++;
    }
  }

  // Step 6: Switch to moderator and retrieve statistics
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const statistics =
    await api.functional.redditCommunity.moderator.communities.reports.statistics.at(
      connection,
      {
        communityName: community.name,
      },
    );
  typia.assert(statistics);

  // Validate statistics
  TestValidator.equals(
    "total reports matches submitted count",
    statistics.total_reports,
    totalReportsSubmitted,
  );

  TestValidator.equals(
    "post reports count matches total",
    statistics.post_reports_count,
    totalReportsSubmitted,
  );

  // Validate reports_by_category contains all submitted categories
  for (const [category, expectedCount] of Object.entries(
    categoryReportCounts,
  )) {
    TestValidator.predicate(
      `reports_by_category contains ${category}`,
      category in statistics.reports_by_category,
    );

    TestValidator.equals(
      `${category} count matches expected`,
      statistics.reports_by_category[category],
      expectedCount,
    );
  }

  // Validate most_common_violation
  const maxCategory = Object.entries(categoryReportCounts).reduce(
    (max, [cat, count]) => (count > max[1] ? [cat, count] : max),
  );

  TestValidator.equals(
    "most_common_violation identifies category with highest count",
    statistics.most_common_violation,
    maxCategory[0],
  );

  // Validate sum of category counts equals total
  const sumOfCategories = Object.values(statistics.reports_by_category).reduce(
    (sum, count) => sum + count,
    0,
  );

  TestValidator.equals(
    "sum of category counts equals total_reports",
    sumOfCategories,
    statistics.total_reports,
  );
}
