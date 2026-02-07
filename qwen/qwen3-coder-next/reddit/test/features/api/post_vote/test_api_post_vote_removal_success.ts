import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote } from "../../../generate/generate_random_reddit_platform_user_reddit_platform_posts_votes_create_vote";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_vote_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const userToken = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: userToken.token.access,
  };
  typia.assert(userToken);
  // 2. Create a test post
  const post = await api.functional.redditPlatform.user.posts.create(
    userConnection,
    {
      body: typia.random<IRedditPlatformPost.ICreate>(),
    },
  );
  typia.assert(post);
  // 3. Cast an upvote on the post
  const vote =
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.createVote(
      userConnection,
      {
        postId: (post as any).postId,
        body: { type: "up" } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote);
  // 4. Remove the upvote
  await api.functional.redditPlatform.user.posts.votes.erase(userConnection, {
    postId: (post as any).postId,
  });
  // 5. Verify the vote was removed by checking vote score
  const updatedPost = await api.functional.redditPlatform.user.posts.create(
    userConnection,
    {
      body: typia.random<IRedditPlatformPost.ICreate>(),
    },
  );
  typia.assert(updatedPost);
  TestValidator.equals("vote removed", (post as any).score, 0);
}