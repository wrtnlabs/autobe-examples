import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test administrator comment creation with elevated privileges across
 * communities.
 *
 * This test validates that platform administrators can create comments on posts
 * regardless of community membership or moderator status. It verifies proper
 * comment initialization, content validation, and immediate availability.
 *
 * Steps:
 *
 * 1. Create and authenticate administrator account
 * 2. Create a community (as member) for testing
 * 3. Create a post in the community as administrator
 * 4. Create a comment on the post with administrator privileges
 * 5. Validate comment properties and constraints
 */
export async function test_api_comment_creation_by_administrator_with_elevated_privileges(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create a community for testing
  const communityData = {
    code: RandomGenerator.alphaNumeric(10).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "technology",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post in the community as administrator
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.admin.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post with administrator privileges
  const commentContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 8,
  });
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: commentContent,
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.admin.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Step 5: Validate comment properties and constraints
  TestValidator.equals(
    "comment post ID matches",
    comment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment content matches input",
    comment.content_text,
    commentContent,
  );
  TestValidator.equals(
    "comment vote score initialized to zero",
    comment.vote_score,
    0,
  );
  TestValidator.equals("comment depth is zero for top-level", comment.depth, 0);
  TestValidator.equals("comment not edited initially", comment.edited, false);
}
