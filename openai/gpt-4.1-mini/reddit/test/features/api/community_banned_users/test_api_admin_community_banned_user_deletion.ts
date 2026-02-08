import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_community_banned_user_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Since there's no way to create a banned user record in provided APIs or info,
  // simulate the existence by generating a random UUID for bannedUserId for success
  // and non-existent cases
  // Success case: Assume the bannedUserId exists and can be deleted
  const bannedUserIdExists = typia.random<string & tags.Format<"uuid">>();
  // Failure case: A different non-existent bannedUserId
  const bannedUserIdNonExistent = typia.random<string & tags.Format<"uuid">>();
  // Simulate success deletion
  await api.functional.communityPlatform.admin.community_banned_users.erase(
    adminConnection,
    { bannedUserId: bannedUserIdExists },
  );
  // Simulate failure deletion with 404
  await TestValidator.httpError(
    "delete non-existent banned user returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.community_banned_users.erase(
        adminConnection,
        { bannedUserId: bannedUserIdNonExistent },
      );
    },
  );
  // Unauthorized access case - no admin authorization headers
  // Use base connection without Authorization header
  await TestValidator.httpError(
    "unauthorized delete banned user fails",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.community_banned_users.erase(
        connection, // base connection without admin auth
        { bannedUserId: bannedUserIdExists },
      );
    },
  );
}
