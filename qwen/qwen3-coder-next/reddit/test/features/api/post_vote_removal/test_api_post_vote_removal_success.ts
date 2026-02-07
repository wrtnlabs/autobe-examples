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
  // 1. Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Update connection with token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${userAuth.token.access}`,
  };
  // 2. Create a post to vote on
  const post = await api.functional.redditPlatform.user.posts.create(
    authenticatedConnection,
    {
      body: {
        content_type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Cast initial upvote on the post
  const vote =
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.createVote(
      authenticatedConnection,
      {
        postId: (post as IEntity).id,
        body: { vote_type: "up" } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote);
  // 4. Remove the vote using DELETE endpoint
  const removeResult =
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.erase(
      authenticatedConnection,
      {
        postId: (post as IEntity).id,
      },
    );
  typia.assert(removeResult);
  // 5. Verify the vote record is deleted
  // If the vote was successfully removed, attempting to remove again should fail
  await TestValidator.error("vote already removed", async () => {
    await api.functional.redditPlatform.user.redditPlatform.posts.votes.erase(
      authenticatedConnection,
      {
        postId: (post as IEntity).id,
      },
    );
  });
}