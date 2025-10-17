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
 * Test vote status correctly indicates no vote after removing a previously cast
 * vote.
 *
 * This test validates the complete vote lifecycle on comments:
 *
 * 1. Create a member account for authentication
 * 2. Create a community context for the post
 * 3. Create a post within the community
 * 4. Create a comment on the post
 * 5. Cast an upvote on the comment
 * 6. Verify the vote status shows upvote (+1)
 * 7. Remove the vote
 * 8. Retrieve vote status again to verify it indicates no vote exists
 *
 * This validates the distinction between 'never voted' and 'vote removed'
 * states.
 */
export async function test_api_comment_vote_status_after_vote_removal(
  connection: api.IConnection,
) {
  // 1. Create a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "A1!",
  } satisfies IRedditLikeMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // 2. Create a community
  const communityData = {
    code: RandomGenerator.alphabets(10).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: communityData,
    },
  );
  typia.assert(community);

  // 3. Create a post in the community
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

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: postData,
  });
  typia.assert(post);

  // 4. Create a comment on the post
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRedditLikeComment.ICreate;

  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: commentData,
    },
  );
  typia.assert(comment);

  // 5. Cast an upvote on the comment
  const voteData = {
    vote_value: 1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const vote = await api.functional.redditLike.member.comments.votes.create(
    connection,
    {
      commentId: comment.id,
      body: voteData,
    },
  );
  typia.assert(vote);

  // 6. Verify vote status shows upvote
  const voteStatusBefore =
    await api.functional.redditLike.member.comments.votes.me.at(connection, {
      commentId: comment.id,
    });
  typia.assert(voteStatusBefore);
  TestValidator.equals(
    "vote status should show upvote",
    voteStatusBefore.vote_value,
    1,
  );

  // 7. Remove the vote
  await api.functional.redditLike.member.comments.votes.erase(connection, {
    commentId: comment.id,
  });

  // 8. Retrieve vote status to verify no vote exists
  // After vote removal, the API should return an error or null state indicating no active vote
  await TestValidator.error(
    "should error when retrieving vote status after removal",
    async () => {
      await api.functional.redditLike.member.comments.votes.me.at(connection, {
        commentId: comment.id,
      });
    },
  );
}
