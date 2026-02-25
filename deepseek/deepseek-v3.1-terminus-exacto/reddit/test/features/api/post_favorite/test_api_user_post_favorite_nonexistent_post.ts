import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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

/**
 * Test error handling when attempting to favorite a non-existent post.
 * This test validates the business logic that prevents favoriting posts that don't exist.
 * Steps:
 * 1. Create and authenticate a user account
 * 2. Generate a valid UUID that doesn't correspond to any existing post
 * 3. Attempt to favorite the non-existent post
 * 4. Validate that the API returns a 404 Not Found error
 * This tests post existence validation rather than input validation.
 */
export async function test_api_user_post_favorite_nonexistent_post(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Generate a valid UUID that doesn't correspond to any existing post
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to favorite non-existent post and validate 404 error
  await TestValidator.httpError(
    "favorite non-existent post should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.posts.favorites.create(
        userConnection,
        {
          postId: nonExistentPostId,
        },
      );
    },
  );
}
