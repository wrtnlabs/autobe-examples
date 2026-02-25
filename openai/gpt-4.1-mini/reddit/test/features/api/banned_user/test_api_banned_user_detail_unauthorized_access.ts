import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

export async function test_api_banned_user_detail_unauthorized_access(
  connection: api.IConnection,
) {
  // Create admin connection and join to get a banned user id
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // Prepare a banned user id by retrieving a banned user (simulate forbidden to fetch)
  // We simulate banned user id by just random UUID (as we cannot create banned user directly)
  // Actually, since without auth, forbidden error is expected anyway
  const randomBannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Now we try to access banned user detail without authentication
  await TestValidator.httpError(
    "should forbid unauthorized access to banned user detail",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.banned_users.at(connection, {
        id: randomBannedUserId,
      });
    },
  );
}
