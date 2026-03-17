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

export async function test_api_super_admin_demotion_unauthorized_by_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Super Admin A (will perform the promote setup)
  const superAdminAConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Register Regular Admin B (the unauthorized caller)
  const adminBConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // Step 3: Register Regular Admin C (will be promoted to super admin as demotion target)
  const adminCConnection: api.IConnection = { host: connection.host };
  const adminCAuthorized = await authorize_admin_join(adminCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminCAuthorized);
  // Step 4: Super Admin A promotes Admin C to super administrator
  const promotedSuperAdmin =
    await api.functional.shoppingMall.superAdmin.admins.promote(
      superAdminAConnection,
      {
        adminId: adminCAuthorized.admin.id,
      },
    );
  typia.assert(promotedSuperAdmin);
  // Test: Regular Admin B (unauthorized) attempts to demote Admin C's super admin record
  // This must be rejected with a 403 Forbidden error
  await TestValidator.error(
    "regular admin must not be able to demote a super admin",
    async () => {
      await api.functional.shoppingMall.superAdmin.superAdmins.demote(
        adminBConnection,
        {
          superAdminId: promotedSuperAdmin.id,
        },
      );
    },
  );
}
