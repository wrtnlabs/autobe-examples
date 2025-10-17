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
 * Test that editing a comment preserves its accumulated vote score and karma.
 *
 * This test validates the comment editing workflow while ensuring voting
 * integrity:
 *
 * 1. Create author account for comment creation and editing
 * 2. Create community context for the post
 * 3. Create post to host the comment
 * 4. Create comment to receive votes and be edited
 * 5. Have multiple users vote on the comment to establish vote score
 * 6. Edit the comment and verify vote score preservation
 * 7. Validate that edited flag is set and content is updated
 * 8. Confirm voting history and karma attribution remain intact
 */
export async function test_api_comment_edit_preserves_vote_score(
  connection: api.IConnection,
) {
  // Step 1: Create author account and authenticate
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = typia.random<string & tags.MinLength<8>>();
  const authorUsername = RandomGenerator.alphaNumeric(12);

  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: authorUsername,
        email: authorEmail,
        password: authorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(author);

  // Step 2: Create community
  const communityCode = RandomGenerator.alphaNumeric(10);
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create post
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create original comment
  const originalCommentText = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: originalCommentText,
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment);

  TestValidator.equals(
    "initial comment text matches",
    comment.content_text,
    originalCommentText,
  );
  TestValidator.equals("initial vote score is zero", comment.vote_score, 0);
  TestValidator.equals("initial edited flag is false", comment.edited, false);

  // Step 5: Create voter accounts and cast votes
  const voterCount = 5;
  const voteValues = [1, 1, 1, -1, -1] as const;

  const votes: IRedditLikeCommentVote[] = await ArrayUtil.asyncRepeat(
    voterCount,
    async (index) => {
      const voterEmail = typia.random<string & tags.Format<"email">>();
      const voterPassword = typia.random<string & tags.MinLength<8>>();
      const voterUsername = RandomGenerator.alphaNumeric(12);

      const voter: IRedditLikeMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: {
            username: voterUsername,
            email: voterEmail,
            password: voterPassword,
          } satisfies IRedditLikeMember.ICreate,
        });
      typia.assert(voter);

      const vote: IRedditLikeCommentVote =
        await api.functional.redditLike.member.comments.votes.create(
          connection,
          {
            commentId: comment.id,
            body: {
              vote_value: voteValues[index],
            } satisfies IRedditLikeCommentVote.ICreate,
          },
        );
      typia.assert(vote);
      return vote;
    },
  );

  // Calculate expected vote score from vote values
  const expectedVoteScore = voteValues.reduce((sum, val) => sum + val, 0);
  TestValidator.equals("expected vote score calculation", expectedVoteScore, 1);

  // Switch back to author account by re-authenticating
  const authorReauth: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(authorReauth);

  // Step 6: Edit the comment
  const updatedCommentText = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 6,
    wordMax: 12,
  });
  const editedComment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.update(connection, {
      commentId: comment.id,
      body: {
        content_text: updatedCommentText,
      } satisfies IRedditLikeComment.IUpdate,
    });
  typia.assert(editedComment);

  // Step 7: Validate edited comment preserves vote score
  TestValidator.equals(
    "vote score preserved after edit",
    editedComment.vote_score,
    expectedVoteScore,
  );
  TestValidator.equals("edited flag set to true", editedComment.edited, true);
  TestValidator.equals(
    "content text updated",
    editedComment.content_text,
    updatedCommentText,
  );
  TestValidator.equals("comment ID unchanged", editedComment.id, comment.id);
  TestValidator.equals(
    "post association unchanged",
    editedComment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    editedComment.created_at,
    comment.created_at,
  );

  // Validate that comment depth and nesting remain unchanged
  TestValidator.equals("comment depth unchanged", editedComment.depth, 0);
}
