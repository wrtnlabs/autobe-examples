import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_permanent_removal(
  connection: api.IConnection,
) {
  // Step 1: Create super admin account (first admin with authority to delete others)
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = typia.random<string & tags.MinLength<8>>();
  const superAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(superAdmin);

  // Step 2: Create target admin account to be deleted (support_admin role)
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdminPassword = typia.random<string & tags.MinLength<8>>();
  const targetAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: targetAdminEmail,
      password: targetAdminPassword,
      name: RandomGenerator.name(),
      role_level: "support_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(targetAdmin);

  // Step 3: Perform permanent deletion of target admin account
  // Note: SDK automatically manages authentication tokens, deletion proceeds with current admin context
  await api.functional.shoppingMall.admin.admins.erase(connection, {
    adminId: targetAdmin.id,
  });

  // Successful completion without exception indicates the admin was permanently deleted
}
