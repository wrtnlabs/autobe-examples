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

export async function test_api_super_admin_demotion_not_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminResponse =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(superAdminResponse);
  // Create new connection with the token from super admin registration
  const superAdminWithToken: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: superAdminResponse.token.access,
    },
  };
  // Step 2: Demote the super admin to regular admin
  const demotionUser = typia.random<string>();
  const demoteResponse =
    await api.functional.discussionBoard.superAdmin.admin.roles.demote_super.demoteSuper(
      superAdminWithToken,
      {
        userId: demotionUser,
        body: typia.random<IDiscussionBoardAdminsRole.IUpdate>(),
      },
    );
  typia.assert(demoteResponse);
  // Step 3 & 4: Try to demote the now regular admin again - should fail
  await TestValidator.error(
    "second demotion should fail for non-super admin",
    async () => {
      await api.functional.discussionBoard.superAdmin.admin.roles.demote_super.demoteSuper(
        superAdminWithToken,
        {
          userId: demotionUser,
          body: typia.random<IDiscussionBoardAdminsRole.IUpdate>(),
        },
      );
    },
  );
}
