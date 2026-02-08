import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_banned_user_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and create authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Attempt to retrieve banned user details with an invalid UUID
  const invalidBannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect an HTTP error 404 Not Found when accessing non-existent bannedUserId
  await TestValidator.httpError(
    "admin banned user detail not found",
    404,
    async () => {
      await api.functional.communityPlatform.admin.bannedUsers.at(
        adminConnection,
        {
          bannedUserId: invalidBannedUserId,
        },
      );
    },
  );
}
