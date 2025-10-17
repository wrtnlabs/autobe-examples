import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_moderator_comment_vote_change_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account for community creation
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

  // Step 3: Member creates a community
  const communityData = {
    code: RandomGenerator.alphabets(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Moderator creates a post
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.moderator.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Moderator creates a comment
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.moderator.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  const initialVoteScore = comment.vote_score;

  // Step 6: Cast initial downvote
  const downvoteData = {
    vote_value: -1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const downvote: IRedditLikeCommentVote =
    await api.functional.redditLike.moderator.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: downvoteData,
      },
    );
  typia.assert(downvote);

  TestValidator.equals("downvote value should be -1", downvote.vote_value, -1);

  // Step 7: Change vote to upvote
  const upvoteData = {
    vote_value: 1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const upvote: IRedditLikeCommentVote =
    await api.functional.redditLike.moderator.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: upvoteData,
      },
    );
  typia.assert(upvote);

  // Step 8: Validate vote transition
  TestValidator.equals(
    "final vote value should be upvote",
    upvote.vote_value,
    1,
  );

  // Verify the vote change reflects the correct state
  TestValidator.predicate(
    "vote changed from downvote to upvote",
    upvote.vote_value === 1,
  );

  // Validate the net score change of +2 (from -1 to +1)
  const expectedScoreChange = 2;
  TestValidator.predicate(
    "vote transition represents net +2 score change",
    upvote.vote_value - downvote.vote_value === expectedScoreChange,
  );
}
