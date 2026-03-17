import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
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

export async function test_api_admin_login_super_admin_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare administrator credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 2. Register a new administrator account (created with ADMIN grade)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // Verify initial grade is ADMIN
  TestValidator.equals(
    "initial grade is ADMIN",
    adminJoinResult.grade,
    "ADMIN",
  );
  // 3. Register a super administrator account
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResult = await authorize_super_admin_join(
    superAdminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminJoinResult);
  // 4. Promote the regular administrator to SUPER_ADMIN grade
  const promotedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.promote(
      superAdminJoinConnection,
      {
        adminId: adminJoinResult.id,
      },
    );
  typia.assert(promotedAdmin);
  // Verify promotion was successful
  TestValidator.equals(
    "promoted grade is SUPER_ADMIN",
    promotedAdmin.grade,
    "SUPER_ADMIN",
  );
  // 5. Login with the promoted administrator's credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLoginResult);
  // 6. Verify the login response includes grade level as SUPER_ADMIN
  TestValidator.equals(
    "login returns SUPER_ADMIN grade",
    adminLoginResult.grade,
    "SUPER_ADMIN",
  );
}
