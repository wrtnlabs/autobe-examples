import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { prepare_random_reddit_like_post_vote } from "../../../prepare/prepare_random_reddit_like_post_vote";

export async function test_api_member_post_vote_status_downvote_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(2),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create a post to vote on
  const post = await api.functional.redditLike.member.posts.votes.create(
    memberConnection,
    {
      postId: typia.random<string>(),
      body: { value: 1 } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(post);
  // 3. Downvote the post
  const vote = await api.functional.redditLike.member.posts.votes.create(
    memberConnection,
    {
      postId: post.id,
      body: { value: -1 } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(vote);
  // 4. Retrieve vote status
  const status =
    await api.functional.redditLike.member.posts.votes.getVoteStatus(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(status);
  // 5. Validate
  TestValidator.equals("postId matches", status.post_id, post.id);
  TestValidator.equals("vote value is -1", status.value, -1);
  TestValidator.predicate(
    "has valid timestamp",
    status.created_at !== undefined,
  );
}
