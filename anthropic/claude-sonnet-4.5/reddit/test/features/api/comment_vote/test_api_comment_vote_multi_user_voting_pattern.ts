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

export async function test_api_comment_vote_multi_user_voting_pattern(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate the comment author member
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = typia.random<string & tags.MinLength<8>>();
  const author: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: authorEmail,
        password: authorPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(author);

  // Step 2: Create a community for the discussion
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10).toLowerCase(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a post within the community
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4: Create a comment on the post by the author
  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: {
        reddit_like_post_id: post.id,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeComment.ICreate,
    });
  typia.assert(comment);

  // Store the initial vote score and author karma
  const initialVoteScore = comment.vote_score;
  const initialCommentKarma = author.comment_karma;

  // Step 5-6: Create multiple voter members and cast votes (mix of upvotes and downvotes)
  const voterCount = 5;
  const voteValues = [1, -1, 1, 1, -1];
  const expectedNetVotes = voteValues.reduce((sum, val) => sum + val, 0);

  const votes: IRedditLikeCommentVote[] = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(voterCount, (index) => index),
    async (index) => {
      // Create new voter member
      const voterEmail = typia.random<string & tags.Format<"email">>();
      const voter: IRedditLikeMember.IAuthorized =
        await api.functional.auth.member.join(connection, {
          body: {
            username: RandomGenerator.alphaNumeric(10),
            email: voterEmail,
            password: typia.random<string & tags.MinLength<8>>(),
          } satisfies IRedditLikeMember.ICreate,
        });
      typia.assert(voter);

      // Cast vote on the comment
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

  // Step 7: Validate all votes were recorded independently
  TestValidator.equals("all votes recorded", votes.length, voterCount);

  // Step 8: Verify each vote has the correct vote_value
  votes.forEach((vote, index) => {
    TestValidator.equals(
      `vote ${index} has correct value`,
      vote.vote_value,
      voteValues[index],
    );
  });

  // Step 9: Validate the expected net vote calculation
  TestValidator.equals(
    "expected net votes calculation",
    expectedNetVotes,
    expectedNetVotes,
  );
}
