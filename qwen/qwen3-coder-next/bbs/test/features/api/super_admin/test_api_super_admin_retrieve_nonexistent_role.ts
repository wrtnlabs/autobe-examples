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

export async function test_api_super_admin_retrieve_nonexistent_role(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register super admin account
  await api.functional.discussionBoard.auth.super_admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // Attempt to retrieve non-existent role - should throw 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent role",
    404,
    async () =>
      await api.functional.discussionBoard.superAdmin.admin.roles.at(
        adminConnection,
        {
          roleId: typia.random<string>(),
        },
      ),
  );
}
