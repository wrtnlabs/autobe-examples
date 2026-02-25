import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_retrieve_detail_admin_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a non-existing post by an admin returns 404 error.
  // 1. Create a new admin account using authorize_admin_join utility.
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = admin.token.access;
  // 2. Use a random UUID for postId that does not exist.
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call api.functional.communityPlatform.admin.posts.at with nonExistentPostId
  //    expecting to throw HttpError with 404 status code.
  await TestValidator.httpError(
    "fetch non-existing post should fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.at(adminConnection, {
        postId: nonExistentPostId,
      });
    },
  );
}
