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

export async function test_api_comment_vote_status_after_vote_change(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create community context
  const communityData = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create post for comment context
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Create comment to vote on
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Step 5: Cast initial upvote
  const upvoteData = {
    vote_value: 1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const upvoteResult: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: comment.id,
      body: upvoteData,
    });
  typia.assert(upvoteResult);

  // Step 6: Verify initial upvote status
  const firstStatusCheck: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.me.at(connection, {
      commentId: comment.id,
    });
  typia.assert(firstStatusCheck);

  TestValidator.equals(
    "initial vote status should show upvote",
    firstStatusCheck.vote_value,
    1,
  );

  // Step 7: Change vote to downvote
  const downvoteData = {
    vote_value: -1,
  } satisfies IRedditLikeCommentVote.ICreate;

  const downvoteResult: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.create(connection, {
      commentId: comment.id,
      body: downvoteData,
    });
  typia.assert(downvoteResult);

  // Step 8: Verify updated vote status reflects downvote
  const secondStatusCheck: IRedditLikeCommentVote =
    await api.functional.redditLike.member.comments.votes.me.at(connection, {
      commentId: comment.id,
    });
  typia.assert(secondStatusCheck);

  TestValidator.equals(
    "updated vote status should show downvote",
    secondStatusCheck.vote_value,
    -1,
  );
}
