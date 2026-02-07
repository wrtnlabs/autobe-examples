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

export async function test_api_super_admin_retrieve_regular_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdminConnection);
  // 2. Create a regular administrator role through promotion workflow
  // First create a regular admin user
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    regularAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(regularAdminConnection);
  // Get the user ID from the regular admin connection
  const userId = typia.random<string>();
  // Promote the regular admin to super admin
  const promotedRole =
    await api.functional.discussionBoard.superAdmin.admin.roles.promote_super.promoteSuper(
      regularAdminConnection,
      {
        userId: userId,
      },
    );
  typia.assert<IDiscussionBoardAdminsRole>(promotedRole);
  // 3. Retrieve the role using super admin connection
  const retrievedRole =
    await api.functional.discussionBoard.superAdmin.admin.roles.at(
      superAdminConnection,
      {
        roleId: typia.random<string>(),
      },
    );
  typia.assert(retrievedRole);
}
