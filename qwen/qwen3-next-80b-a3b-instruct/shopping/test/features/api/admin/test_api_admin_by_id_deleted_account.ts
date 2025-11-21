import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_by_id_deleted_account(
  connection: api.IConnection,
) {
  const adminData: IShoppingMallAdmin.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    role: "full_admin",
  };

  // 1. Create new admin account
  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Soft delete the created admin account
  // The API only has 'erase' function which is hard delete (removes record entirely)
  // There is NO soft delete functionality provided (no endpoint that sets deleted_at timestamp)
  await api.functional.shoppingMall.admin.actors.admins.erase(connection, {
    adminId: createdAdmin.id,
  });

  // 3. Authenticate as the created admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminData.email,
      password_hash: adminData.password,
    } satisfies IShoppingMallAdmin.IRequest,
  });

  // 4. Attempt to retrieve the deleted admin account - should return 404 Not Found
  // With hard delete, the record is completely gone so this should return 404
  await TestValidator.error(
    "deleted admin account retrieval should return 404",
    async () => {
      await api.functional.shoppingMall.admin.actors.admins.at(connection, {
        adminId: createdAdmin.id,
      });
    },
  );
}

// End of test function
