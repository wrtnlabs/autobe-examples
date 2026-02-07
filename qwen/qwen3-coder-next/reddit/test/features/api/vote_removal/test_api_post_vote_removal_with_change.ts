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

export async function test_api_post_vote_removal_with_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create a new post
  const post = await api.functional.redditPlatform.user.posts.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Cast an upvote on the post
  const upvote =
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.createVote(
      userConnection,
      {
        postId: (post as IEntity).id, // Changed to use IEntity interface
        body: { vote_type: "up" } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(upvote);
  // 4. Change vote from upvote to downvote
  const downvote =
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.createVote(
      userConnection,
      {
        postId: (post as IEntity).id,
        body: { vote_type: "down" } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(downvote);
  // 5. Remove the downvote
  const removeResult =
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.erase(
      userConnection,
      {
        postId: (post as IEntity).id,
      },
    );
  typia.assert(removeResult);
  // 6. Verify that user cannot vote again immediately (single vote policy)
  await TestValidator.error("cannot vote twice", async () => {
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.createVote(
      userConnection,
      {
        postId: (post as IEntity).id,
        body: { vote_type: "up" } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  });
}