import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_deletion_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create the target admin account to be deleted
  const targetAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetAdminConnection, {
    body: targetAdminCredentials,
  });
  typia.assert(targetAdmin);
  // Step 2: Create a superadmin account with deletion privileges
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  typia.assert(superAdmin);
  // Step 3: Verify that superadmin can successfully delete target admin
  await api.functional.shoppingMall.admin.admins.erase(superAdminConnection, {
    adminId: targetAdmin.id,
  });
  // Step 4: Verify that superadmin cannot delete their own account
  await TestValidator.error(
    "superadmin cannot delete their own account",
    async () => {
      await api.functional.shoppingMall.admin.admins.erase(
        superAdminConnection,
        {
          adminId: superAdmin.id,
        },
      );
    },
  );
}
