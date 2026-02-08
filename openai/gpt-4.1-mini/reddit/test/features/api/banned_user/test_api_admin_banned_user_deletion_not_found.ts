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

export async function test_api_admin_banned_user_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Attempt to delete a banned user using a random, non-existent UUID
  const nonExistentBannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify the deletion request results in a 404 Not Found error
  await TestValidator.httpError(
    "admin banned user deletion - non-existent bannedUserId",
    404,
    async () => {
      await api.functional.communityPlatform.admin.bannedUsers.eraseBannedUser(
        adminConnection,
        {
          bannedUserId: nonExistentBannedUserId,
        },
      );
    },
  );
}
