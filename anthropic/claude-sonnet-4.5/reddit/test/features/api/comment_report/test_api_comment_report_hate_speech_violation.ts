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
 * Test reporting a comment for hate speech violations.
 *
 * This test validates the complete workflow for reporting a comment that
 * contains hate speech in a Reddit-style community platform. The test follows a
 * multi-actor scenario involving moderator, poster, commenter, and reporter to
 * ensure the reporting system works correctly.
 *
 * Steps:
 *
 * 1. Moderator joins and creates a community
 * 2. Member joins and creates a post in the community
 * 3. Another member joins and creates a comment on the post
 * 4. Reporter member joins and reports the comment for hate speech
 * 5. Validate the report was created with correct category, status, and timestamps
 */
export async function test_api_comment_report_hate_speech_violation(
  connection: api.IConnection,
) {
  // Step 1: Moderator joins and creates community
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      ip: undefined,
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
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 2: Member joins and creates a post
  const postAuthor = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: undefined,
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
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: undefined,
        image_url: undefined,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Commenter joins and creates a comment
  const commenter = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(commenter);

  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: undefined,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Reporter joins and reports the comment for hate speech
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(reporter);

  const report =
    await api.functional.redditCommunity.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          content_type: "comment",
          target_content_id: comment.id,
          reddit_community_community_id: community.id,
          category: "hate_speech",
          description:
            "This comment contains offensive hate speech targeting a protected group. The language used is clearly discriminatory and violates community standards for respectful discourse.",
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 5: Validate report details
  TestValidator.equals(
    "report category is hate_speech",
    report.category,
    "hate_speech",
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report content_type is comment",
    report.content_type,
    "comment",
  );
  TestValidator.equals(
    "report targets correct community",
    report.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "report targets correct member",
    report.reddit_community_member_id,
    reporter.id,
  );
  TestValidator.predicate(
    "report description exists",
    report.description !== null && report.description !== undefined,
  );
  TestValidator.predicate(
    "report created_at is set",
    report.created_at.length > 0,
  );
  TestValidator.predicate(
    "report updated_at is set",
    report.updated_at.length > 0,
  );
  TestValidator.equals("report deleted_at is null", report.deleted_at, null);
  TestValidator.equals(
    "report resolution is not set",
    report.resolution,
    undefined,
  );
}
