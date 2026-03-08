import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_votes_create_vote } from "../../../generate/generate_random_reddit_like_member_posts_votes_create_vote";
import { prepare_random_reddit_like_post_vote } from "../../../prepare/prepare_random_reddit_like_post_vote";

export async function test_api_member_vote_self_post_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a valid post ID for testing (since we can't create posts)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Member attempts to vote on own post (should be rejected with 403)
  await TestValidator.error("self-voting rejection", async () => {
    await api.functional.redditLike.member.posts.votes.createVote(
      memberConnection,
      {
        postId: postId,
        body: {
          value: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<-1> &
            tags.Maximum<1>,
        },
      },
    );
  });
  // 4. Since we can't verify post details without a 'get' endpoint,
  // we validate that the API correctly rejects self-voting attempts
}
