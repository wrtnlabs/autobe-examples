import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_text_retrieval_by_admin_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test-password",
      displayName: "admin-user",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare a random UUID which doesn't correspond to any post
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve text content for the non-existent post and expect 404 error
  await TestValidator.httpError(
    "post text retrieval for non-existent post should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.texts.atText(
        adminConnection,
        {
          postId: nonExistentPostId,
        },
      );
    },
  );
}
