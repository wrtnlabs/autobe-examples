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
 * Test the complete workflow of a member reporting a post for violating
 * community guidelines.
 *
 * This scenario validates that the reporting system properly captures violation
 * reports against post content and initiates the moderation workflow. The test
 * establishes the necessary context by creating a moderator who creates a
 * community, then a first member who creates a post within that community, and
 * finally a second member account to act as the reporter who identifies the
 * rule-violating content.
 *
 * Validation Steps:
 *
 * 1. Moderator account creation and community setup
 * 2. First member creates a post with content
 * 3. Second member (reporter) submits violation report
 * 4. Verify report creation with pending status
 * 5. Verify post reference through content_type and target_content_id
 * 6. Verify reporter identity and community context
 */
export async function test_api_content_report_post_violation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create first member account (post author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: authorEmail,
        password: "author123",
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
  typia.assert(author);

  // Step 4: First member creates a post
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create second member account (reporter)
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: reporterEmail,
        password: "reporter123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: true,
        show_subscribed_communities: true,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(reporter);

  // Step 6: Reporter submits violation report against the post
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post",
        target_content_id: post.id,
        reddit_community_community_id: community.id,
        category: "spam",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report);

  // Step 7: Validate report data
  TestValidator.equals(
    "report content type is post",
    report.content_type,
    "post",
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report references correct community",
    report.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals("report category is spam", report.category, "spam");
  TestValidator.equals(
    "reporter member ID matches authenticated user",
    report.reddit_community_member_id,
    reporter.id,
  );
}
