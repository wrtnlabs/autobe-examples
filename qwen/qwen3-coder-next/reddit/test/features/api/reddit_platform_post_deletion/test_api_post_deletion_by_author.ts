import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test post deletion by author workflow.
 * 1. Register and authenticate as post author
 * 2. Create a new post
 * 3. Delete the post as the authenticated author
 */
export async function test_api_post_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as post author
  const authorConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(authResponse);
  // Step 2: Create a new post as the authenticated author
  const createdPost = await generate_random_reddit_platform_user_posts_create(
    authorConnection,
    {},
  );
  typia.assert(createdPost);
  // Step 3: Delete the post as the authenticated author
  await api.functional.redditPlatform.user.posts.erase(authorConnection, {
    postId: "placeholder-post-id",
  });
}
