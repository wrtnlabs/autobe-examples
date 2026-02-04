import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_superadmin_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
    },
  });
  typia.assert(superAdmin);
  // Step 2: Create admin account (for banning super admin)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    },
  });
  typia.assert(admin);
  // Step 3: Ban the super admin account using admin connection
  await api.functional.shoppingMall.admin.customers.ban.erase(adminConnection, {
    customerId: superAdmin.id,
  });
  // Step 4: Attempt to log in as the banned super admin
  // This should fail with 403 Forbidden
  await TestValidator.error("banned super admin cannot log in", async () => {
    const loginConnection: api.IConnection = { host: connection.host };
    // Use the same password from creation - banned status should override
    await authorize_super_admin_login(loginConnection, {
      body: {
        email: superAdmin.email,
        password,
      },
    });
  });
}
