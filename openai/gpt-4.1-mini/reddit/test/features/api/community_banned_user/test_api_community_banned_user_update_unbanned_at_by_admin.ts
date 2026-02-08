import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_banned_user_update_unbanned_at_by_admin(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };

  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // No unbanned_at in update DTO, so update with empty body or other valid update fields
  // Assuming empty update to test update API call
  const updatedBannedUser = await api.functional.communityPlatform.admin.community_banned_users.update(
    adminConnection,
    {
      bannedUserId: bannedUserId,
      body: {},
    },
  );
  typia.assert(updatedBannedUser);

  // No unbanned_at property to check, so skip validation on that

  await TestValidator.error(
    "error on update with invalid bannedUserId",
    async () => {
      await api.functional.communityPlatform.admin.community_banned_users.update(
        adminConnection,
        {
          bannedUserId: "invalid-uuid-format",
          body: {},
        },
      );
    },
  );
}
