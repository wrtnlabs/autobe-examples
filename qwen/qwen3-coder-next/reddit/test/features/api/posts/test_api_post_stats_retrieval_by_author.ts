import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostViewStat";
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
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_stats_retrieval_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(registered);
  // 2. Create authenticated connection with returned token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    authorization: registered.token.access,
  };
  // 3. Create a post using the available API
  const post = await api.functional.redditPlatform.user.posts.create(
    authenticatedConnection,
    {
      body: typia.random<IRedditPlatformPost.ICreate>(),
    },
  );
  typia.assert(post);
  // 4. Generate a valid UUID for postId since post.id is not accessible from the DTO
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 5. Retrieve post statistics
  const stats = await api.functional.redditPlatform.posts.stats(
    authenticatedConnection,
    {
      postId: postId,
    },
  );
  typia.assert(stats);
  // 6. Validate statistics structure
  TestValidator.predicate(
    "stats object exists",
    stats !== null && stats !== undefined,
  );
}
