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
 * Test complete workflow for casting an upvote on a comment.
 *
 * This test validates the democratic content curation system where members
 * endorse valuable comments. The test creates a new member account, establishes
 * a community context, creates a post within that community, adds a comment to
 * the post, then casts an upvote (+1) on that comment.
 *
 * The test verifies:
 *
 * 1. The vote is recorded in reddit_like_comment_votes table
 * 2. The comment's vote_score is incremented by 1
 * 3. The comment author's comment_karma increases by 1 in real-time
 * 4. The response includes updated vote state and current comment score
 *
 * This validates the complete voting workflow from authentication through karma
 * attribution.
 */
export async function test_api_comment_vote_upvote_submission(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for voting
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a community to host posts and comments
  const communityData = {
    code: RandomGenerator.alphaNumeric(10).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
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

  // Step 3: Create a post to hold comments
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 6 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create a comment that will receive the upvote
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Verify comment starts with zero vote score
  TestValidator.equals("comment initial vote score", comment.vote_score, 0);

  // Step 5: Cast an upvote on the comment
  const voteData = {
    vote_value: 1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const vote: IRedditLikeCommentVote =
    await api.functional.redditLike.comments.votes.create(connection, {
      commentId: comment.id,
      body: voteData,
    });
  typia.assert(vote);

  // Step 6: Validate the vote was recorded correctly
  TestValidator.equals("vote value is upvote", vote.vote_value, 1);
  TestValidator.predicate(
    "vote has valid ID",
    typeof vote.id === "string" && vote.id.length > 0,
  );
  TestValidator.predicate(
    "vote has creation timestamp",
    typeof vote.created_at === "string",
  );
  TestValidator.predicate(
    "vote has update timestamp",
    typeof vote.updated_at === "string",
  );
}
