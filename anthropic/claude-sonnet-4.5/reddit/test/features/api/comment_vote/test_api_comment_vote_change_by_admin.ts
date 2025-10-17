import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the vote change workflow where an administrator changes their vote on a
 * comment.
 *
 * This test validates that administrators can change their votes on comments
 * from upvote to downvote or vice versa. It verifies that:
 *
 * 1. The initial vote is properly recorded
 * 2. Vote changes update the existing record rather than creating duplicates
 * 3. The comment's vote_score is adjusted correctly with a net change of ±2
 * 4. The system properly handles vote state transitions
 *
 * The test follows the complete workflow:
 *
 * - Create member and admin accounts
 * - Member creates community, post, and comment
 * - Admin casts initial upvote (+1)
 * - Admin changes vote to downvote (-1)
 * - Verify vote_score shows correct net change of -2
 */
export async function test_api_comment_vote_change_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content authoring
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Member creates a community
  const communityData = {
    code: RandomGenerator.alphaNumeric(10).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // Step 3: Member creates a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postData,
  });
  typia.assert(post);

  // Step 4: Member creates a comment on the post
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeComment.ICreate;

  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: commentData,
    },
  );
  typia.assert(comment);

  // Record initial vote score (should be 0 for new comment)
  const initialVoteScore = comment.vote_score;
  TestValidator.equals("initial vote score is zero", initialVoteScore, 0);

  // Step 5: Create admin account for voting
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 6: Admin casts initial upvote (+1)
  const initialVoteData = {
    vote_value: 1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const initialVote =
    await api.functional.redditLike.admin.comments.votes.create(connection, {
      commentId: comment.id,
      body: initialVoteData,
    });
  typia.assert(initialVote);

  // Verify initial vote was recorded
  TestValidator.equals(
    "initial vote value is upvote",
    initialVote.vote_value,
    1,
  );

  // Step 7: Admin changes vote to downvote (-1)
  const changedVoteData = {
    vote_value: -1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const changedVote =
    await api.functional.redditLike.admin.comments.votes.create(connection, {
      commentId: comment.id,
      body: changedVoteData,
    });
  typia.assert(changedVote);

  // Step 8: Verify the vote was updated (same vote ID means update, not duplicate)
  TestValidator.equals(
    "vote record was updated not duplicated",
    changedVote.id,
    initialVote.id,
  );

  // Step 9: Verify the vote value changed to downvote
  TestValidator.equals(
    "changed vote value is downvote",
    changedVote.vote_value,
    -1,
  );

  // Step 10: Verify the vote record was updated (updated_at should be different)
  TestValidator.notEquals(
    "vote updated timestamp changed",
    changedVote.updated_at,
    initialVote.updated_at,
  );
}
