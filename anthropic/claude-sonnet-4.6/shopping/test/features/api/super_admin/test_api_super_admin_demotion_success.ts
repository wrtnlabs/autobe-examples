import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_super_admin_demotion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup SuperAdmin A - create and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Setup Admin B - create and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuth);
  // 3. SuperAdmin A promotes Admin B to super admin
  const promotedSuperAdmin =
    await api.functional.shoppingMall.superAdmin.admins.promote(
      superAdminConnection,
      {
        adminId: adminAuth.admin.id,
      },
    );
  typia.assert(promotedSuperAdmin);
  // 4. SuperAdmin A demotes Admin B (now super admin) back to regular admin
  // The promote response is IShoppingMallSuperAdmin, its .id is the superAdminId
  const demotedAdmin =
    await api.functional.shoppingMall.superAdmin.superAdmins.demote(
      superAdminConnection,
      {
        superAdminId: promotedSuperAdmin.id,
      },
    );
  typia.assert(demotedAdmin);
  // 5. Validate the demotion result
  TestValidator.equals(
    "demoted admin grade is regular",
    demotedAdmin.grade,
    "regular",
  );
  TestValidator.equals(
    "demoted admin email matches admin B",
    demotedAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "demoted admin account is still active",
    demotedAdmin.deleted_at,
    null,
  );
}
