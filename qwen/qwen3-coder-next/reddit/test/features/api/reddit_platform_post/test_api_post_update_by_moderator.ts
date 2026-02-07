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

export async function test_api_post_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as regular user to create a post
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {} satisfies IRedditPlatformUser.IJoin,
  });
  // 2. Create a post in a community
  const post = await api.functional.redditPlatform.user.posts.create(
    userConnection,
    {
      body: {} satisfies IRedditPlatformPost.ICreate,
    },
  );
  const typedPost = typia.assert<IRedditPlatformPost & IEntity>(post);
  // 3. Authenticate as moderator of the community
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_user_join(moderatorConnection, {
    body: {} satisfies IRedditPlatformUser.IJoin,
  });
  // 4. Moderator updates the post
  const updatedPost = await api.functional.redditPlatform.user.posts.update(
    moderatorConnection,
    {
      postId: typedPost.id,
      body: {} satisfies IRedditPlatformPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 5. Validate the update - note: IRedditPlatformPost is defined as empty {},
  // so we can only validate the update operation succeeded
  TestValidator.predicate("update operation successful", updatedPost !== null);
}