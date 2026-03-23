import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import type { IRedditLikeCommentVotesSum } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVotesSum";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_comments_vote_update } from "../../../generate/generate_random_reddit_like_member_comments_vote_update";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_comment_vote } from "../../../prepare/prepare_random_reddit_like_comment_vote";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_comment_vote_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post for comment
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Cast upvote (+1) on the comment
  const upvote = await api.functional.redditLike.member.comments.vote.update(
    memberConnection,
    {
      commentId: comment.id,
      body: { value: 1 } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(upvote);
  // 5. Retrieve vote status and verify voteValue is +1
  const voteSum1 = await api.functional.redditLike.member.comments.vote.at(
    memberConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(voteSum1);
  TestValidator.equals("voteValue is +1", voteSum1.voteValue, 1);
  // 6. Change vote to -1 (downvote)
  const downvote = await api.functional.redditLike.member.comments.vote.update(
    memberConnection,
    {
      commentId: comment.id,
      body: { value: -1 } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  typia.assert(downvote);
  const voteSum2 = await api.functional.redditLike.member.comments.vote.at(
    memberConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(voteSum2);
  TestValidator.equals("voteValue changed to -1", voteSum2.voteValue, -1);
  // 7. Remove vote by setting value to null
  await api.functional.redditLike.member.comments.vote.update(
    memberConnection,
    {
      commentId: comment.id,
      body: { value: null } satisfies IRedditLikeCommentVote.ICreate,
    },
  );
  const voteSum3 = await api.functional.redditLike.member.comments.vote.at(
    memberConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(voteSum3);
  TestValidator.equals(
    "vote removed, voteValue is null",
    voteSum3.voteValue,
    null,
  );
}
