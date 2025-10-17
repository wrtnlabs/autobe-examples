import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the complete workflow of creating nested reply comments in a threaded
 * discussion.
 *
 * This scenario validates the core comment threading functionality by creating
 * a member account, establishing a community, creating a post within that
 * community, adding an initial top-level comment to the post, and then creating
 * a nested reply to that comment. The test verifies that the reply is properly
 * associated with its parent comment through the reddit_like_parent_comment_id
 * relationship, that the depth level is correctly calculated as parent depth +
 * 1, that the reply initializes with zero vote score, and that the comment is
 * immediately available for further nesting.
 *
 * This tests real user behavior where community members engage in multi-level
 * discussions by responding to specific comments rather than only replying to
 * posts at the top level.
 */
export async function test_api_comment_reply_creation_nested_thread(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Establish a community to host the discussion
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post within that community to serve as the discussion container
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Add an initial top-level comment to the post
  const topLevelCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const topLevelComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: topLevelCommentData,
    });
  typia.assert(topLevelComment);

  // Validate top-level comment properties
  TestValidator.equals(
    "top-level comment has depth 0",
    topLevelComment.depth,
    0,
  );
  TestValidator.equals(
    "top-level comment has zero vote score",
    topLevelComment.vote_score,
    0,
  );
  TestValidator.equals(
    "top-level comment is not edited",
    topLevelComment.edited,
    false,
  );
  TestValidator.equals(
    "top-level comment has no parent",
    topLevelComment.reddit_like_parent_comment_id,
    undefined,
  );

  // Step 5: Create a nested reply to that comment
  const replyData = {
    content_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeComment.IReplyCreate;

  const reply: IRedditLikeComment =
    await api.functional.redditLike.member.comments.replies.create(connection, {
      commentId: topLevelComment.id,
      body: replyData,
    });
  typia.assert(reply);

  // Validate reply comment properties
  TestValidator.equals(
    "reply is associated with parent comment",
    reply.reddit_like_parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "reply depth is parent depth + 1",
    reply.depth,
    topLevelComment.depth + 1,
  );
  TestValidator.equals(
    "reply initializes with zero vote score",
    reply.vote_score,
    0,
  );
  TestValidator.equals("reply is not edited", reply.edited, false);
  TestValidator.equals(
    "reply belongs to same post",
    reply.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "reply has correct content",
    reply.content_text,
    replyData.content_text,
  );
  TestValidator.predicate(
    "reply has valid id",
    reply.id !== undefined && reply.id.length > 0,
  );
  TestValidator.predicate(
    "reply has creation timestamp",
    reply.created_at !== undefined,
  );
  TestValidator.predicate(
    "reply has update timestamp",
    reply.updated_at !== undefined,
  );
}
