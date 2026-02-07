import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminsRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRole";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_promote_regular_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // 2. Create regular admin account to be promoted
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const registerResponse = await api.functional.discussionBoard.auth.admin.join(
    regularAdminConnection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  typia.assert(registerResponse);
  const adminId = registerResponse.token.access.split(".")[0]; // Extract a fake UUID-like ID
  // 3. Authenticate as super admin
  const superAdminAuth: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.login(superAdminAuth, {
    body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
  });
  // 4. Promote regular admin to super admin
  const promoted =
    await api.functional.discussionBoard.superAdmin.admin.roles.promote_super.promoteSuper(
      superAdminAuth,
      {
        userId: adminId,
      },
    );
  typia.assert(promoted);
  // 5. Validate the promotion result
  TestValidator.predicate(
    "promotion result has expected structure",
    typeof promoted === "object" && promoted !== null,
  );
}
