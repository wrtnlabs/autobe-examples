import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test retrieving vote status after casting a downvote on a comment.
 *
 * This test validates the complete workflow of the voting system by verifying
 * that a member can successfully cast a downvote on a comment and then retrieve
 * their vote status to confirm the downvote is correctly tracked.
 *
 * Steps:
 *
 * 1. Create and authenticate a new member account
 * 2. Create a community for organizing content
 * 3. Create a post within the community
 * 4. Create a comment on the post
 * 5. Cast a downvote (-1) on the comment
 * 6. Retrieve the vote status to verify downvote was recorded correctly
 */
export async function test_api_comment_vote_status_retrieval_after_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member account
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Step 2: Create a community for content organization
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Step 5: Cast a downvote (-1) on the comment
  const downvoteData = {
    vote_value: -1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const downvote: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: comment.id,
      body: downvoteData,
    });
  typia.assert(downvote);

  // Step 6: Retrieve the vote status to verify downvote was recorded
  const voteStatus: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.me.at(connection, {
      commentId: comment.id,
    });
  typia.assert(voteStatus);

  // Verify the vote status matches the downvote we cast
  TestValidator.equals(
    "vote status ID matches downvote ID",
    voteStatus.id,
    downvote.id,
  );
  TestValidator.equals(
    "vote value is -1 for downvote",
    voteStatus.vote_value,
    -1,
  );
  TestValidator.equals(
    "vote timestamps match",
    voteStatus.created_at,
    downvote.created_at,
  );
}
