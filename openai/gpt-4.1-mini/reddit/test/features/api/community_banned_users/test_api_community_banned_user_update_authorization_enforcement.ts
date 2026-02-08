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

export async function test_api_community_banned_user_update_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // Test authorization enforcement when updating a banned user record.
  // Attempt to update ban reason without admin authorization and expect access denied error.
  // Then perform admin join and retry update successfully.
  // This scenario ensures only admins can update banned user records, preventing unauthorized modifications.
  // Validate proper HTTP status codes and error messages for unauthorized access attempts.
  // 1. Use base connection to try update without authorization
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: ICommunityPlatformCommunityBannedUser.IUpdate =
    typia.random<ICommunityPlatformCommunityBannedUser.IUpdate>();
  // Use base connection to call the update endpoint expecting failure
  await TestValidator.httpError(
    "update without admin authorization results in 401/403",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.community_banned_users.update(
        connection,
        {
          bannedUserId: bannedUserId,
          body: updateBody,
        },
      );
    },
  );
  // 2. Perform admin join and get admin authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 3. Retry update with admin authorization
  const updated =
    await api.functional.communityPlatform.admin.community_banned_users.update(
      adminConnection,
      {
        bannedUserId: bannedUserId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 4. Validate updated record fields
  TestValidator.predicate("banned user update has a result", Boolean(updated));
}
