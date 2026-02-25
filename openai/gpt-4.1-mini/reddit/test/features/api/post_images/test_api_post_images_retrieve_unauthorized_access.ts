import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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

export async function test_api_post_images_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user account and login
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // 2. Attempt to retrieve post images without authentication
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  // 2a. Using no authentication (base connection without auth headers)
  await TestValidator.httpError(
    "unauthorized access without auth",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.user.posts.images.atImages(
        { host: connection.host },
        { postId: randomPostId },
      );
    },
  );
  // 2b. Using authenticated user who likely doesn't have access (random post ID)
  await TestValidator.httpError(
    "unauthorized access with unrelated user",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.user.posts.images.atImages(
        userConnection,
        { postId: randomPostId },
      );
    },
  );
}
