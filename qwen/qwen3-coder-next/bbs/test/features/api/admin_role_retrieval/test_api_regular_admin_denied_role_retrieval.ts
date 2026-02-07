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

export async function test_api_regular_admin_denied_role_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin user with unique credentials
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: "123456",
        name: "Super Admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminConnection);
  // 2. Login as super admin
  await api.functional.discussionBoard.auth.super_admin.login(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: "123456",
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  // 3. Get a role as super admin (this should work)
  const role = await api.functional.discussionBoard.superAdmin.admin.roles.at(
    superAdminConnection,
    {
      roleId: "test-role-id",
    },
  );
  typia.assert(role);
  // 4. Create regular admin user with unique credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: {
      email: adminEmail,
      password: "123456",
      name: "Regular Admin",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminConnection);
  // 5. Login as regular admin
  await api.functional.discussionBoard.auth.admin.login(adminConnection, {
    body: {
      email: adminEmail,
      password: "123456",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 6. Verify regular admin is denied access to role retrieval
  await TestValidator.error("regular admin denied role access", async () => {
    await api.functional.discussionBoard.superAdmin.admin.roles.at(
      adminConnection,
      {
        roleId: (role as any).id ?? (role as any).roleId ?? "test-role-id",
      },
    );
  });
}