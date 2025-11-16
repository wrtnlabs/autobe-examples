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
 * Test that temporal report metrics (reports_last_24h, reports_last_7d,
 * reports_last_30d) accurately reflect reports submitted within their
 * respective time windows.
 *
 * Workflow:
 *
 * 1. Create moderator account and community
 * 2. Create member accounts for reporting
 * 3. Create posts in the community
 * 4. Submit multiple reports (all recent since created during test)
 * 5. Retrieve statistics immediately after report submission
 *
 * Validation points:
 *
 * - All temporal metrics equal total_reports (all reports are recent)
 * - Temporal counts are non-negative integers
 * - Statistics provide insight into recent moderation activity trends
 */
export async function test_api_community_report_statistics_temporal_metrics(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://test.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://test.example.com" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityData = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase() satisfies string &
      tags.MinLength<3> &
      tags.MaxLength<21> &
      tags.Pattern<"^[a-z0-9_]+$">,
    display_title: RandomGenerator.name(2) satisfies string &
      tags.MaxLength<100>,
    description: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
      tags.MaxLength<500>,
    rules: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
      tags.MaxLength<500>,
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create multiple member accounts and posts
  const memberCount = 3;
  const postsPerMember = 2;
  const members: IRedditCommunityGuest.IAuthorized[] = [];
  const memberPasswords: string[] = [];
  const posts: IRedditCommunityPost[] = [];

  for (let i = 0; i < memberCount; i++) {
    const memberPassword = typia.random<string & tags.MinLength<8>>();
    const memberData = {
      username: RandomGenerator.alphaNumeric(8) satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<50>,
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: "https://test.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberData,
    });
    typia.assert(member);
    members.push(member);
    memberPasswords.push(memberPassword);

    // Create posts for this member
    for (let j = 0; j < postsPerMember; j++) {
      const postType = RandomGenerator.pick(["text", "link", "image"] as const);
      const postData = {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<300>,
        post_type: postType,
        body:
          postType === "text"
            ? RandomGenerator.content({ paragraphs: 2 })
            : null,
        url:
          postType === "link"
            ? typia.random<string & tags.MaxLength<2000> & tags.Format<"uri">>()
            : null,
        image_url:
          postType === "image"
            ? typia.random<string & tags.Format<"uri">>()
            : null,
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
  }

  // Step 4: Submit multiple reports
  const reportCount = 5;
  const categories = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "other",
  ] as const;

  for (let i = 0; i < reportCount; i++) {
    const reporterIndex = i % memberCount;
    const postIndex = i % posts.length;

    await api.functional.auth.member.login(connection, {
      body: {
        username: members[reporterIndex].username,
        email: undefined,
        password: memberPasswords[reporterIndex],
        ip: "127.0.0.1",
        href: "https://test.example.com/member/login" satisfies string &
          tags.Format<"uri">,
        referrer: "https://test.example.com" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ILogin,
    });

    const category = categories[i % categories.length];
    const reportData = {
      content_type: "post" as "post" | "comment",
      target_content_id: posts[postIndex].id,
      reddit_community_community_id: community.id,
      category: category,
      description:
        category === "other"
          ? RandomGenerator.paragraph({ sentences: 2 })
          : RandomGenerator.paragraph({ sentences: 1 }),
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
  }

  // Step 5: Switch back to moderator and retrieve statistics
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: "127.0.0.1",
      href: "https://test.example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com" satisfies string &
        tags.Format<"uri">,
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

  // Step 6: Validate temporal metrics
  TestValidator.equals(
    "total_reports should equal number of submitted reports",
    statistics.total_reports,
    reportCount,
  );

  TestValidator.equals(
    "reports_last_24h should equal total_reports (all reports are recent)",
    statistics.reports_last_24h,
    reportCount,
  );

  TestValidator.equals(
    "reports_last_7d should equal total_reports (all reports are recent)",
    statistics.reports_last_7d,
    reportCount,
  );

  TestValidator.equals(
    "reports_last_30d should equal total_reports (all reports are recent)",
    statistics.reports_last_30d,
    reportCount,
  );

  TestValidator.predicate(
    "all temporal metrics should be non-negative",
    statistics.reports_last_24h >= 0 &&
      statistics.reports_last_7d >= 0 &&
      statistics.reports_last_30d >= 0,
  );

  TestValidator.predicate(
    "temporal metrics follow logical hierarchy (24h <= 7d <= 30d)",
    statistics.reports_last_24h <= statistics.reports_last_7d &&
      statistics.reports_last_7d <= statistics.reports_last_30d,
  );
}
