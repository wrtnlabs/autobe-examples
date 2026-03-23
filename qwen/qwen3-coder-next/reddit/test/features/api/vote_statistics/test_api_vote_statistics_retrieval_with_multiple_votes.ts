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

export async function test_api_vote_statistics_retrieval_with_multiple_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Member creates a post
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Multiple users vote on the post
  // 3-1. Second member joins and upvotes
  const voter1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(voter1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  const vote1 = await api.functional.redditLike.member.posts.votes.create(
    voter1Connection,
    {
      postId: post.id,
      body: { value: 1 } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(vote1);
  // 3-2. Third member joins and downvotes
  const voter2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(voter2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  const vote2 = await api.functional.redditLike.member.posts.votes.create(
    voter2Connection,
    {
      postId: post.id,
      body: { value: -1 } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(vote2);
  // 4. Original member retrieves vote statistics for their post
  const stats =
    await api.functional.redditLike.member.vote_statistics.voteStatistics(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(stats);
  // 5. Verify vote_score (upvotes - downvotes), upvotes count, downvotes count, and current user's vote status (should be neutral)
  TestValidator.equals(
    "vote_score = 0 (1 upvote - 1 downvote)",
    stats.vote_score,
    0,
  );
  TestValidator.equals("upvotes count", stats.upvotes, 1);
  TestValidator.equals("downvotes count", stats.downvotes, 1);
  TestValidator.equals("status should be neutral", stats.status, "neutral");
}
