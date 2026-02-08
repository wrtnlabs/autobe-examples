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

export async function test_api_admin_banned_user_detail_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test that unauthorized access to the banned user detail endpoint is denied.
  // Attempt to call GET /communityPlatform/admin/bannedUsers/{bannedUserId} without admin authorization.
  // Generate a random UUID for bannedUserId path parameter
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Try to fetch banned user detail without setting any auth headers
  await TestValidator.httpError(
    "unauthorized access to banned user detail",
    [401, 403],
    async () => {
      // Use base connection, no login
      await api.functional.communityPlatform.admin.bannedUsers.at(connection, {
        bannedUserId,
      });
    },
  );
}
