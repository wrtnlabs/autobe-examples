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

/**
 * Test that demoting a regular administrator is rejected as invalid operation.
 *
 * The demote endpoint is specifically designed to downgrade SUPER_ADMIN to ADMIN grade,
 * not to demote regular ADMIN accounts. This test validates that attempting to demote
 * a regular administrator results in an error, ensuring the business rule is enforced.
 *
 * Test Flow:
 * 1. Create super admin account via join
 * 2. Create regular admin account via join
 * 3. Authenticate as super admin
 * 4. Attempt to call demote endpoint with regular admin's ID
 * 5. Verify the operation is rejected because target is not a SUPER_ADMIN
 */
export async function test_api_administrator_grade_regular_admin_demotion_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Store passwords for login
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create super admin account
  const superAdminJoin = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdminJoin);
  // 2. Create regular admin account
  const adminJoin = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 3. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminJoin.email,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.ILogin,
  });
  // 4. Attempt to demote regular admin (should fail)
  // The demote endpoint only works on SUPER_ADMIN accounts, not ADMIN accounts
  await TestValidator.error("regular admin demotion rejected", async () => {
    await api.functional.shoppingMall.superAdmin.admins.demote(
      superAdminConnection,
      {
        adminId: adminJoin.id,
      },
    );
  });
}