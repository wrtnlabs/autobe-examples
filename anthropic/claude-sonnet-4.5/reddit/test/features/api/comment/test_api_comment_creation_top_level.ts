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
 * Test creating a top-level comment directly on a post.
 *
 * This test validates the complete workflow of creating a top-level comment on
 * a post within a Reddit-like community platform. The test ensures proper
 * initialization of comment properties and correct relationship establishment
 * between posts and comments.
 *
 * Test workflow:
 *
 * 1. Register a new member account and authenticate
 * 2. Create a new community as the authenticated member
 * 3. Create a post within the community
 * 4. Create a top-level comment on the post (without parent comment)
 * 5. Validate comment properties (depth=0, vote_score=0, edited=false)
 * 6. Verify correct post reference and content
 */
export async function test_api_comment_creation_top_level(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const authenticatedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create a community
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
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

  // Step 3: Create a post in the community
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
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a top-level comment on the post
  const commentText = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 9,
  });
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: commentText,
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Step 5: Validate comment properties
  TestValidator.equals("comment depth is 0 for top-level", comment.depth, 0);
  TestValidator.equals("initial vote score is 0", comment.vote_score, 0);
  TestValidator.equals("comment not edited initially", comment.edited, false);
  TestValidator.equals(
    "comment text matches input",
    comment.content_text,
    commentText,
  );
  TestValidator.equals(
    "comment references correct post",
    comment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "no parent comment for top-level",
    comment.reddit_like_parent_comment_id,
    undefined,
  );
}
