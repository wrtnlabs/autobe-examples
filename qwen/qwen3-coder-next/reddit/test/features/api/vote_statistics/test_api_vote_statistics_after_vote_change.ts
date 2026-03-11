import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikePostVotesSum } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVotesSum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_vote } from "../../../prepare/prepare_random_reddit_like_post_vote";

export async function test_api_vote_statistics_after_vote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Create a post
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text" as const,
        content: RandomGenerator.content(),
      },
    },
  );
  // 3. Upvote own post
  const upvote = await generate_random_reddit_like_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { value: 1 },
    },
  );
  typia.assert(upvote);
  // 4. Check vote statistics after upvote
  const statsAfterUpvote =
    await api.functional.redditLike.member.vote_statistics.voteStatistics(
      memberConnection,
      { postId: post.id },
    );
  typia.assert(statsAfterUpvote);
  TestValidator.equals("upvote count is 1", statsAfterUpvote.upvotes, 1);
  TestValidator.equals("downvote count is 0", statsAfterUpvote.downvotes, 0);
  TestValidator.equals("score is 1", statsAfterUpvote.vote_score, 1);
  TestValidator.equals(
    "vote status is upvoted",
    statsAfterUpvote.status,
    "upvoted",
  );
  // 5. Change vote to downvote
  const downvote = await generate_random_reddit_like_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { value: -1 },
    },
  );
  typia.assert(downvote);
  // 6. Check vote statistics after changing to downvote
  const statsAfterDownvote =
    await api.functional.redditLike.member.vote_statistics.voteStatistics(
      memberConnection,
      { postId: post.id },
    );
  typia.assert(statsAfterDownvote);
  TestValidator.equals("upvote count remains 1", statsAfterDownvote.upvotes, 1);
  TestValidator.equals(
    "downvote count becomes 1",
    statsAfterDownvote.downvotes,
    1,
  );
  TestValidator.equals(
    "score changes from 1 to -1",
    statsAfterDownvote.vote_score,
    -1,
  );
  TestValidator.equals(
    "vote status changes to downvoted",
    statsAfterDownvote.status,
    "downvoted",
  );
}