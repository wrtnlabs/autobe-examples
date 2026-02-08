import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_platform_admin_community_ban_unban_not_banned(
  connection: api.IConnection,
): Promise<void> {
  // Prepare admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // As per dependencies, admin join is the auth method
  await authorize_admin_join(adminConnection, {
    body: {}, // ICommunityPlatformAdmin.IJoin is an empty type
  });
  // For unban attempt, use random UUIDs to represent communityId and bannedUserId
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to unban a non-banned user, expecting an HTTP error
  await TestValidator.httpError(
    "unban non-banned user should fail",
    400, // Bad Request is typical for invalid ban record
    async () => {
      await api.functional.communityPlatform.admin.communities.bans.unban(
        adminConnection,
        {
          communityId,
          bannedUserId,
        },
      );
    },
  );
}
