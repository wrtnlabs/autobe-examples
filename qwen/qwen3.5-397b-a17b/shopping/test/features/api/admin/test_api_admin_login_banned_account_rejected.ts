import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Test that banned administrator accounts cannot log in.
 *
 * Validates the business rule that administrators banned by other admins lose login access while their data is preserved. The test creates a super administrator account, uses it to create and then ban a regular administrator account, and verifies that the banned administrator cannot authenticate despite providing correct credentials.
 *
 * The ban mechanism sets the banned_at timestamp on the administrator record, which is checked during login authentication. When banned_at is not null, the login is rejected with 401 Unauthorized. This security control ensures that administrators who violate policies or leave the organization can be immediately blocked from accessing administrative functions while maintaining their historical audit trail for compliance purposes.
 *
 * 1. Super administrator account is created and authenticated.
 * 2. Regular administrator account is created with unique credentials.
 * 3. Super administrator bans the regular admin by setting banned_at timestamp.
 * 4. Login attempt with banned admin's correct credentials is rejected.
 * 5. Validates that rejection occurs due to ban status, not credential mismatch.
 */
export async function test_api_admin_login_banned_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account with fresh connection
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  const adminId = adminJoinResult.id;
  // 3. Super admin bans the regular administrator
  const banTimestamp = new Date().toISOString();
  const updatedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId: adminId,
        body: {
          banned_at: banTimestamp,
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin);
  // Verify the admin is now banned
  TestValidator.equals("admin is banned", updatedAdmin.bannedAt, banTimestamp);
  TestValidator.notEquals(
    "admin was not previously banned",
    updatedAdmin.bannedAt,
    null,
  );
  // 4. Attempt login with banned admin's correct credentials - should fail
  const bannedAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("banned admin login rejected", async () => {
    await authorize_admin_login(bannedAdminConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdmin.ILogin,
    });
  });
}
