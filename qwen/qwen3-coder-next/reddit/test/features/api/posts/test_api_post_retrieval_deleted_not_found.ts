import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_retrieval_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // Create community
  const community = await api.functional.redditPlatform.user.communities.create(
    userConnection,
    {
      body: typia.random<IRedditPlatformCommunity.ICreate>(),
    },
  );
  typia.assert(community);
  // Create post
  const post = await api.functional.redditPlatform.user.posts.create(
    userConnection,
    {
      body: typia.random<IRedditPlatformPost.ICreate>(),
    },
  );
  const assertPost = typia.assert<IRedditPlatformPost & { id: string }>(post);
  // Delete the post
  await api.functional.redditPlatform.user.posts.erase(userConnection, {
    postId: assertPost.id,
  });
  // Attempt to retrieve deleted post - should return 404
  await TestValidator.error("deleted post returns 404", async () => {
    await api.functional.redditPlatform.posts.at(userConnection, {
      postId: assertPost.id,
    });
  });
}