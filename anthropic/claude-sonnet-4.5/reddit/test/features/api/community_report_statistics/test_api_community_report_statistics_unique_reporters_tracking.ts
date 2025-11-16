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
 * Test that the unique_reporters metric accurately counts distinct members who
 * have submitted reports.
 *
 * This test validates the system's ability to track reporting participation
 * breadth by ensuring that the unique_reporters count reflects the number of
 * distinct members who submitted reports, not the total number of reports. When
 * a member submits multiple reports, they should be counted only once in the
 * unique_reporters metric.
 *
 * Workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a community for testing
 * 3. Create 5 distinct member accounts
 * 4. Create multiple posts in the community
 * 5. Have each member submit at least one report (some submit multiple)
 * 6. Retrieve report statistics and verify unique_reporters count
 *
 * Validation:
 *
 * - Unique_reporters equals the number of distinct members (5)
 * - Total_reports may exceed unique_reporters when members submit multiple
 *   reports
 * - The metric correctly reflects community engagement in content moderation
 */
export async function test_api_community_report_statistics_unique_reporters_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityData = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 3: Create 5 distinct member accounts and store credentials
  const memberCount = 5;
  const memberCredentials: Array<{
    username: string;
    password: string;
    email: string;
  }> = [];

  for (let i = 0; i < memberCount; i++) {
    const password = typia.random<string & tags.MinLength<8>>();
    const username = RandomGenerator.alphaNumeric(12);
    const email = typia.random<string & tags.Format<"email">>();

    const memberData = {
      username: username,
      email: email,
      password: password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate;

    const member = await api.functional.auth.member.join(connection, {
      body: memberData,
    });
    typia.assert(member);

    memberCredentials.push({ username, password, email });
  }

  // Step 4: Create multiple posts in the community
  const posts: IRedditCommunityPost[] = [];
  const postCount = 8;

  for (let i = 0; i < postCount; i++) {
    // Switch to a member account to create posts
    const memberIndex = i % memberCount;
    await api.functional.auth.member.login(connection, {
      body: {
        username: memberCredentials[memberIndex].username,
        password: memberCredentials[memberIndex].password,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ILogin,
    });

    const postData = {
      community_id: community.id,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      post_type: RandomGenerator.pick(["text", "link", "image"] as const),
      body: RandomGenerator.content({ paragraphs: 2 }),
      url: null,
      image_url: null,
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

  // Step 5: Have each member submit reports (some submit multiple)
  let totalReportsSubmitted = 0;

  for (let i = 0; i < memberCount; i++) {
    // Login as this member
    await api.functional.auth.member.login(connection, {
      body: {
        username: memberCredentials[i].username,
        password: memberCredentials[i].password,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ILogin,
    });

    // Each member submits 1-3 reports depending on their index
    const reportsToSubmit = (i % 3) + 1;

    for (let j = 0; j < reportsToSubmit; j++) {
      const postIndex = (i + j) % posts.length;

      const reportData = {
        content_type: "post" as const,
        target_content_id: posts[postIndex].id,
        reddit_community_community_id: community.id,
        category: RandomGenerator.pick([
          "spam",
          "harassment",
          "hate_speech",
          "misinformation",
        ] as const),
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
      totalReportsSubmitted++;
    }
  }

  // Step 6: Switch to moderator and retrieve statistics
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: null,
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

  // Validation: Verify unique_reporters equals the number of distinct members
  TestValidator.equals(
    "unique_reporters should equal the number of distinct members who submitted reports",
    statistics.unique_reporters,
    memberCount,
  );

  // Validation: Verify total_reports is greater than unique_reporters (since some members submitted multiple)
  TestValidator.predicate(
    "total_reports should be greater than or equal to unique_reporters",
    statistics.total_reports >= statistics.unique_reporters,
  );

  // Validation: Verify total_reports matches what we submitted
  TestValidator.equals(
    "total_reports should match the number of reports submitted",
    statistics.total_reports,
    totalReportsSubmitted,
  );

  // Validation: Verify that when members submit multiple reports, unique_reporters still counts them once
  TestValidator.predicate(
    "unique_reporters demonstrates that multiple reports from same member count as one reporter",
    statistics.unique_reporters === memberCount &&
      statistics.total_reports > memberCount,
  );
}
