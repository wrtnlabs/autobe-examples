import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_role_view_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallAdmin.IJoin;
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  typia.assert(superAdmin);
  // Login as super admin to establish session
  const superAdminSession = await authorize_admin_login(superAdminConnection, {
    body: {
      email: superAdminCredentials.email,
      password: superAdminCredentials.password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(superAdminSession);
  // 2. Register a regular admin account
  const regularAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallAdmin.IJoin;
  const regularAdmin = await authorize_admin_join(connection, {
    body: regularAdminCredentials,
  });
  typia.assert(regularAdmin);
  // 3. Login as regular admin to get admin role details
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminLogin = await authorize_admin_login(
    regularAdminConnection,
    {
      body: {
        email: regularAdminCredentials.email,
        password: regularAdminCredentials.password,
      } satisfies IEcommerceMallAdmin.ILogin,
    },
  );
  typia.assert(regularAdminLogin);
  // 4. Get the regular admin's role via admin roles endpoint
  const regularAdminRoles =
    await api.functional.ecommerceMall.admin.admin_roles.at(
      regularAdminConnection,
      {
        adminRoleId: regularAdmin.id,
      },
    );
  typia.assert(regularAdminRoles);
  // 5. Verify the regular admin role details
  TestValidator.equals(
    "regular admin has correct grade",
    regularAdminRoles.grade,
    "regular",
  );
  TestValidator.equals(
    "regular admin email matches",
    regularAdminRoles.admin.email,
    regularAdminCredentials.email,
  );
  TestValidator.equals(
    "regular admin id matches",
    regularAdminRoles.admin.id,
    regularAdmin.id,
  );
  // 6. Now use super admin connection to view regular admin role (main test scenario)
  const viewedRole = await api.functional.ecommerceMall.admin.admin_roles.at(
    superAdminConnection,
    {
      adminRoleId: regularAdmin.id,
    },
  );
  typia.assert(viewedRole);
  // 7. Verify the super admin can view the regular admin role details
  TestValidator.equals(
    "super admin can view regular admin role",
    viewedRole.grade,
    "regular",
  );
  TestValidator.equals(
    "super admin can view admin email",
    viewedRole.admin.email,
    regularAdminCredentials.email,
  );
  TestValidator.equals(
    "super admin can view admin id",
    viewedRole.admin.id,
    regularAdmin.id,
  );
  TestValidator.equals(
    "viewed role matches original role",
    viewedRole.id,
    regularAdminRoles.id,
  );
}
