import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_banned_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: superAdminData,
  });
  typia.assert(superAdmin);
  // 2. Create admin account for ban operation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminJoined = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(adminJoined);
  // 3. Login as admin to get valid authentication
  const adminLoginData = {
    email: adminData.email,
    password: adminData.password,
  } satisfies IDiscussionBoardAdmin.ILogin;
  await authorize_admin_login(adminConnection, {
    body: adminLoginData,
  });
  // 4. Ban the super admin account using admin connection
  await api.functional.discussionBoard.admin.users.ban(adminConnection, {
    id: superAdmin.id,
    body: {
      reason: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
    } satisfies IDiscussionBoardMember.IBanRequest,
  });
  // 5. Attempt to login as banned super admin - should be rejected
  await TestValidator.error(
    "super admin login should be rejected for banned account",
    async () => {
      const bannedConnection: api.IConnection = { host: connection.host };
      await api.functional.discussionBoard.auth.superAdmin.login(
        bannedConnection,
        {
          body: {
            email: superAdminData.email,
            password: superAdminData.password,
          } satisfies IDiscussionBoardSuperAdmin.ILogin,
        },
      );
    },
  );
  // 6. Verify admin account still works normally
  const adminProfile = await api.functional.discussionBoard.auth.admin.login(
    adminConnection,
    {
      body: adminLoginData,
    },
  );
  typia.assert(adminProfile);
}
