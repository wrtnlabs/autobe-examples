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
 * Test that retrieved comments accurately reflect current vote scores after
 * voting activity.
 *
 * This test validates the complete voting workflow for comments:
 *
 * 1. Create author account and authenticate
 * 2. Create a community to host content
 * 3. Create a post within the community
 * 4. Create a comment on the post
 * 5. Create multiple voter accounts
 * 6. Cast multiple votes (upvotes and downvotes) on the comment
 * 7. Retrieve the comment using public endpoint
 * 8. Validate vote_score accurately reflects net votes (upvotes - downvotes)
 */
export async function test_api_comment_retrieval_with_vote_score_reflection(
  connection: api.IConnection,
) {
  // Step 1: Create author account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: authorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(author);

  // Step 2: Create community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create post
  const postTypes = ["text", "link", "image"] as const;
  const selectedPostType = RandomGenerator.pick(postTypes);

  const postBody = {
    community_id: community.id,
    type: selectedPostType,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body:
      selectedPostType === "text"
        ? RandomGenerator.content({ paragraphs: 2 })
        : undefined,
  } satisfies IRedditLikePost.ICreate;

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postBody,
  });
  typia.assert(post);

  // Step 4: Create comment
  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5 & 6: Create voter accounts and cast votes
  const voterCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<7>
  >();
  const votes = [];

  for (let i = 0; i < voterCount; i++) {
    // Create voter account
    const voterEmail = typia.random<string & tags.Format<"email">>();
    const voter = await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: voterEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(voter);

    // Cast vote (randomly upvote or downvote)
    const voteValues = [1, -1] as const;
    const voteValue = RandomGenerator.pick(voteValues);

    const vote = await api.functional.redditLike.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_value: voteValue,
        } satisfies IRedditLikeCommentVote.ICreate,
      },
    );
    typia.assert(vote);

    votes.push(voteValue);
  }

  // Calculate expected vote score
  const expectedVoteScore = votes.reduce((sum, vote) => sum + vote, 0);

  // Step 7: Retrieve comment using public endpoint
  const retrievedComment = await api.functional.redditLike.comments.at(
    connection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(retrievedComment);

  // Step 8: Validate vote score
  TestValidator.equals(
    "retrieved comment vote_score matches expected net votes",
    retrievedComment.vote_score,
    expectedVoteScore,
  );

  TestValidator.equals(
    "retrieved comment ID matches created comment",
    retrievedComment.id,
    comment.id,
  );

  TestValidator.equals(
    "retrieved comment content matches original",
    retrievedComment.content_text,
    comment.content_text,
  );
}
