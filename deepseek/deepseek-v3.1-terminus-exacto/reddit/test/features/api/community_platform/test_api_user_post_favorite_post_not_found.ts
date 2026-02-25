import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostFavorite";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { prepare_random_community_platform_post_favorite } from "../../../prepare/prepare_random_community_platform_post_favorite";

export async function test_api_user_post_favorite_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: "test" + Date.now() + "@example.com",
      password: "password123",
      username: "testuser" + Date.now(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Attempt to favorite non-existent post with random UUID
  await TestValidator.error("favorite non-existent post", async () => {
    await api.functional.communityPlatform.user.posts.favorite.create(
      userConnection,
      {
        postId: "00000000-0000-0000-0000-000000000000",
      },
    );
  });
}
