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

export async function test_api_admin_role_view_by_regular_admin_self_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register regular admin account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const registerEmail = typia.random<string & tags.Format<"email">>();
  const registerPassword = RandomGenerator.alphaNumeric(16);
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: registerEmail,
      password: registerPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 2. Login as regular admin with credentials
  const regularAdminLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_login(regularAdminLoginConnection, {
    body: {
      email: registerEmail,
      password: registerPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Get regular admin's role (self-view - should succeed)
  // Need to get the admin ID from the regularAdmin token response
  const adminId = regularAdmin.id;
  const myRole = await api.functional.ecommerceMall.admin.admin_roles.at(
    regularAdminLoginConnection,
    {
      adminRoleId: adminId,
    },
  );
  typia.assert(myRole);
  // 4. Verify the response contains the admin's role details
  TestValidator.equals("admin grade is regular", myRole.grade, "regular");
  TestValidator.equals("admin ID matches", myRole.admin.id, adminId);
  // 5. Register another admin account with super grade
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 6. Try to access the other admin's role (should fail with 403)
  await TestValidator.error(
    "regular admin cannot view other admin's role (403 Forbidden)",
    async () => {
      await api.functional.ecommerceMall.admin.admin_roles.at(
        regularAdminLoginConnection,
        {
          adminRoleId: superAdmin.id,
        },
      );
    },
  );
}
