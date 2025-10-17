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
 * Test retrieving a complete comment with all metadata including author
 * information, vote scores, threading depth, and edit status.
 *
 * This test validates the comment retrieval endpoint by creating a complete
 * workflow:
 *
 * 1. Register a new member account
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Create a comment on the post
 * 5. Retrieve the comment and validate all metadata
 *
 * Validates that the comment response includes:
 *
 * - Comment content text with markdown formatting
 * - Vote score initialized to zero
 * - Depth level (0 for top-level comment)
 * - Edited flag set to false
 * - All timestamps (created_at, updated_at)
 * - Proper references to parent post
 */
export async function test_api_comment_retrieval_with_complete_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a community
  const communityData = {
    code: RandomGenerator.alphaNumeric(8),
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

  // Step 3: Create a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
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

  // Step 4: Create a comment on the post
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const createdComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(createdComment);

  // Step 5: Retrieve the comment details
  const retrievedComment: IRedditLikeComment =
    await api.functional.redditLike.comments.at(connection, {
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Step 6: Validate all comment metadata
  TestValidator.equals(
    "comment ID matches",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content_text,
    commentData.content_text,
  );
  TestValidator.equals(
    "comment post reference matches",
    retrievedComment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote score initialized to zero",
    retrievedComment.vote_score,
    0,
  );
  TestValidator.equals(
    "depth level is zero for top-level comment",
    retrievedComment.depth,
    0,
  );
  TestValidator.equals("edited flag is false", retrievedComment.edited, false);
  TestValidator.equals(
    "parent comment is undefined for top-level",
    retrievedComment.reddit_like_parent_comment_id,
    undefined,
  );

  // Validate timestamps exist and are valid
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedComment.created_at !== null &&
      retrievedComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedComment.updated_at !== null &&
      retrievedComment.updated_at !== undefined,
  );
}
