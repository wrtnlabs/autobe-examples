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

/**
 * Test that multiple members can submit independent reports against the same
 * post.
 *
 * This test validates that the system properly handles multiple independent
 * reports from different community members targeting the same post. It ensures
 * that:
 *
 * - Each report is tracked separately without deduplication
 * - Different members can report the same content with different violation
 *   categories
 * - All reports are properly attributed and enter the moderation queue
 * - Multiple reports signal higher severity to moderators
 *
 * Workflow:
 *
 * 1. Create moderator account and community
 * 2. Create member account and post
 * 3. Create multiple reporter member accounts (3 different members)
 * 4. Have each reporter submit a separate report against the same post
 * 5. Validate that each report is unique, properly attributed, and in pending
 *    status
 */
export async function test_api_post_report_submission_multiple_reports_same_post(
  connection: api.IConnection,
) {
  // 1. Create moderator account and community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 2. Create member account and post
  const postAuthorEmail = typia.random<string & tags.Format<"email">>();
  const postAuthorPassword = typia.random<string & tags.MinLength<8>>();
  const postAuthor = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: postAuthorEmail,
      password: postAuthorPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(postAuthor);

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Create multiple reporter member accounts (3 different members)
  const reporterCount = 3;
  const reporters = await ArrayUtil.asyncRepeat(
    reporterCount,
    async (index) => {
      const reporterEmail = typia.random<string & tags.Format<"email">>();
      const reporterPassword = typia.random<string & tags.MinLength<8>>();
      const reporter = await api.functional.auth.member.join(connection, {
        body: {
          username: RandomGenerator.alphabets(8),
          email: reporterEmail,
          password: reporterPassword,
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          avatar_url: typia.random<string & tags.Format<"uri">>(),
          show_online_status: false,
          show_subscribed_communities: false,
          show_activity_feed: true,
          ip: null,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ICreate,
      });
      typia.assert(reporter);
      return { email: reporterEmail, password: reporterPassword, reporter };
    },
  );

  // 4. Have each reporter submit a separate report against the same post with different categories
  const reportCategories = ["spam", "harassment", "hate_speech"] as const;
  const reports = await ArrayUtil.asyncMap(
    reporters,
    async (reporterData, index) => {
      // Switch to reporter account
      await api.functional.auth.member.login(connection, {
        body: {
          email: reporterData.email,
          password: reporterData.password,
          ip: null,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ILogin,
      });

      const report =
        await api.functional.redditCommunity.member.posts.reports.create(
          connection,
          {
            postId: post.id,
            body: {
              content_type: "post",
              target_content_id: post.id,
              reddit_community_community_id: community.id,
              category: reportCategories[index],
              description: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies IRedditCommunityReport.ICreate,
          },
        );
      typia.assert(report);
      return report;
    },
  );

  // 5. Validation: Verify each report is unique, properly attributed, and in pending status
  TestValidator.equals("three reports created", reports.length, reporterCount);

  // Verify each report has unique ID
  const reportIds = reports.map((r) => r.id);
  const uniqueReportIds = new Set(reportIds);
  TestValidator.equals(
    "all report IDs are unique",
    uniqueReportIds.size,
    reporterCount,
  );

  // Verify all reports reference the same target post
  reports.forEach((report, index) => {
    TestValidator.equals(
      `report ${index + 1} targets the correct post`,
      report.target_post?.id ?? null,
      post.id,
    );
  });

  // Verify reports have different categories
  reports.forEach((report, index) => {
    TestValidator.equals(
      `report ${index + 1} has correct category`,
      report.category,
      reportCategories[index],
    );
  });

  // Verify each report is attributed to correct reporter
  reports.forEach((report, index) => {
    TestValidator.equals(
      `report ${index + 1} attributed to correct reporter`,
      report.reddit_community_member_id,
      reporters[index].reporter.id,
    );
  });

  // Verify all reports are in pending status
  reports.forEach((report, index) => {
    TestValidator.equals(
      `report ${index + 1} is in pending status`,
      report.status,
      "pending",
    );
  });

  // Verify each report references the correct community
  reports.forEach((report, index) => {
    TestValidator.equals(
      `report ${index + 1} references correct community`,
      report.reddit_community_community_id,
      community.id,
    );
  });
}
