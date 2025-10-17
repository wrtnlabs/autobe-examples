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
 * Test creating nested comment replies to validate threading functionality.
 *
 * This test validates the complete nested comment threading system by creating
 * a member account, community, post, parent comment, and nested reply. It
 * verifies that the threading structure maintains correct depth levels,
 * parent-child relationships, and metadata.
 *
 * Test Flow:
 *
 * 1. Register and authenticate a new member account
 * 2. Create a community for hosting the discussion
 * 3. Create a post within the community
 * 4. Create a top-level comment (depth=0) on the post
 * 5. Create a nested reply (depth=1) to the parent comment
 * 6. Validate threading structure and relationships
 */
export async function test_api_comment_nested_reply_threading(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member account
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a community for hosting the discussion
  const communityData = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post within the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a top-level comment (depth=0) on the post
  const parentCommentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const parentComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: parentCommentData,
    });
  typia.assert(parentComment);

  // Validate parent comment structure
  TestValidator.equals(
    "parent comment depth should be 0",
    parentComment.depth,
    0,
  );
  TestValidator.equals(
    "parent comment should have no parent",
    parentComment.reddit_like_parent_comment_id,
    undefined,
  );
  TestValidator.equals(
    "parent comment references correct post",
    parentComment.reddit_like_post_id,
    post.id,
  );

  // Step 5: Create a nested reply (depth=1) to the parent comment
  const nestedReplyData = {
    reddit_like_post_id: post.id,
    reddit_like_parent_comment_id: parentComment.id,
    content_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 9,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const nestedReply: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: nestedReplyData,
    });
  typia.assert(nestedReply);

  // Step 6: Validate nested reply threading structure
  TestValidator.equals("nested reply depth should be 1", nestedReply.depth, 1);
  TestValidator.equals(
    "nested reply parent matches parent comment",
    nestedReply.reddit_like_parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "nested reply references correct post",
    nestedReply.reddit_like_post_id,
    post.id,
  );
  TestValidator.predicate(
    "nested reply has valid content",
    nestedReply.content_text.length > 0,
  );
  TestValidator.equals(
    "nested reply initial vote score is 0",
    nestedReply.vote_score,
    0,
  );
  TestValidator.equals(
    "nested reply not edited initially",
    nestedReply.edited,
    false,
  );
}
