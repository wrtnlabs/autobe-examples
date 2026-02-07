import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminsRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRole";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new super admin account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await api.functional.discussionBoard.auth.super_admin.join(
    joinConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(joinResult);
  // Step 2: Create a new connection using the join result token
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  // Step 3: Attempt to demote the super admin's own role
  // This should fail as per the requirement to prevent self-demotion
  await TestValidator.error(
    "super admin cannot demote their own role",
    async () => {
      await api.functional.discussionBoard.superAdmin.admin.roles.manageRole(
        superAdminConnection,
        {
          body: typia.random<IDiscussionBoardAdminsRole.IManageRequest>(),
        },
      );
    },
  );
}
