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
 * Test admin creating a nested reply comment under an existing parent comment.
 *
 * This test validates the complete workflow of an administrator creating a
 * nested reply comment in a threaded discussion. It ensures that nested replies
 * are correctly associated with their parent comments, maintain proper depth
 * levels, and preserve all comment properties including content, threading
 * relationships, and initial state.
 *
 * Workflow steps:
 *
 * 1. Register admin account and obtain authentication tokens
 * 2. Create a community to host the discussion
 * 3. Create a post within the community as the discussion topic
 * 4. Create a top-level parent comment on the post
 * 5. Create a nested reply under the parent comment
 * 6. Validate the reply properties and threading relationships
 */
export async function test_api_admin_nested_comment_reply_creation(
  connection: api.IConnection,
) {
  // Step 1: Register admin account
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

  // Step 2: Create a community
  const communityData = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
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

  // Step 4: Create a top-level parent comment
  const parentCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const parentComment: IRedditLikeComment =
    await api.functional.redditLike.admin.comments.create(connection, {
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Step 5: Create a nested reply under the parent comment
  const replyData = {
    content_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const reply: IRedditLikeComment =
    await api.functional.redditLike.admin.comments.replies.create(connection, {
      commentId: parentComment.id,
      body: replyData,
    });
  typia.assert(reply);

  // Step 6: Validate reply properties
  TestValidator.equals(
    "reply content matches",
    reply.content_text,
    replyData.content_text,
  );
  TestValidator.equals(
    "reply parent comment ID matches",
    reply.reddit_like_parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply post ID matches",
    reply.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "reply depth is parent depth + 1",
    reply.depth,
    parentComment.depth + 1,
  );
  TestValidator.equals("reply initial vote score is zero", reply.vote_score, 0);
  TestValidator.equals("reply not edited initially", reply.edited, false);
}
