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
 * Test reporting a comment without providing the optional description field.
 *
 * This test validates that the description field is truly optional for comment
 * reports. It creates a complete workflow: moderator creates community, member
 * creates post, another member creates comment, and a third member reports the
 * comment with only a category and no description. The test verifies that the
 * report is created successfully with all required fields and description as
 * null.
 *
 * Steps:
 *
 * 1. Moderator joins and creates a community
 * 2. Member joins and creates a post in the community
 * 3. Another member joins and creates a comment on the post
 * 4. A third member joins and reports the comment with category only (no
 *    description)
 * 5. Validate the report was created with description as null and status as
 *    pending
 */
export async function test_api_comment_report_without_optional_description(
  connection: api.IConnection,
) {
  // Step 1: Moderator joins and creates community
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

  // Create community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    rules: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);

  // Step 2: First member joins and creates a post
  const member1Data = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
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

  const member1 = await api.functional.auth.member.join(connection, {
    body: member1Data,
  });
  typia.assert(member1);

  // Create a post
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    { body: postData },
  );
  typia.assert(post);

  // Step 3: Second member joins and creates a comment
  const member2Data = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: null,
    show_online_status: true,
    show_subscribed_communities: true,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: member2Data,
  });
  typia.assert(member2);

  // Create a comment
  const commentData = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 4: Third member joins and reports the comment WITHOUT description
  const member3Data = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: false,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member3 = await api.functional.auth.member.join(connection, {
    body: member3Data,
  });
  typia.assert(member3);

  // Create report with only category, NO description (testing optional field)
  const reportData = {
    content_type: "comment" as const,
    target_content_id: comment.id,
    reddit_community_community_id: community.id,
    category: "spam" as const,
    description: null,
  } satisfies IRedditCommunityReport.ICreate;

  const report =
    await api.functional.redditCommunity.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: reportData,
      },
    );
  typia.assert(report);

  // Step 5: Validate the report was created successfully
  TestValidator.equals("report content type", report.content_type, "comment");
  TestValidator.equals("report category", report.category, "spam");
  TestValidator.equals("report status", report.status, "pending");
  TestValidator.equals(
    "report community id",
    report.reddit_community_community_id,
    community.id,
  );

  // Critical validation: description should be null when not provided
  TestValidator.equals("report description is null", report.description, null);

  // Verify resolution and moderator notes are null for pending reports
  TestValidator.equals("resolution is null", report.resolution, null);
  TestValidator.equals("moderator notes is null", report.moderator_notes, null);
}
