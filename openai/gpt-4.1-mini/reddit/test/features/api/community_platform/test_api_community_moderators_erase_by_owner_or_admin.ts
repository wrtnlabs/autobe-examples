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

export async function test_api_community_moderators_erase_by_owner_or_admin(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a moderator by community owner or system administrator.
  // Scenario 2: Unauthorized deletion attempt.
  // Step 1: Admin join and login for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Prepare valid UUIDs for communityId and moderatorId
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const moderatorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 2: Successful deletion attempt by admin user
  await api.functional.communityPlatform.admin.communities.moderators.eraseModerator(
    adminConnection,
    {
      communityId,
      moderatorId,
    },
  );
  // No content expected on success, so no output to assert
  // Step 3: Unauthorized deletion attempt (no authorization)
  const invalidConnection: api.IConnection = { host: connection.host };
  // Expect forbidden error
  await TestValidator.error(
    "unauthorized deletion should be forbidden",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.eraseModerator(
        invalidConnection,
        {
          communityId,
          moderatorId,
        },
      );
    },
  );
}
