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

export async function test_api_admin_banned_user_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test unauthorized update attempt without admin join authentication
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    reason: "Unauthorized update attempt",
  } satisfies ICommunityPlatformBannedUser.IUpdate;
  // Use base connection without admin authorization
  await TestValidator.httpError(
    "admin banned user update unauthorized",
    403,
    async () => {
      await api.functional.communityPlatform.admin.banned_users.update(
        connection,
        {
          id: bannedUserId,
          body: updateBody,
        },
      );
    },
  );
}
