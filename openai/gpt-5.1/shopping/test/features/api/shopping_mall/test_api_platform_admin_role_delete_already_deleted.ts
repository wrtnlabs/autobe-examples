import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_role_delete_already_deleted(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin session
  const joinRequest = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdmin);

  // 2. Create a fresh admin role with a unique code
  const createBody = typia.random<IShoppingMallAdminRole.ICreate>();
  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // Ensure the created role is active (deleted_at is null or undefined)
  TestValidator.predicate(
    "newly created admin role must not be soft-deleted",
    createdRole.deleted_at === null || createdRole.deleted_at === undefined,
  );

  // 3. First deletion should succeed without error
  await api.functional.shoppingMall.platformAdmin.adminRoles.erase(connection, {
    adminRoleCode: createdRole.code,
  });

  // 4. Second deletion on the same role code should now fail with some HttpError
  await TestValidator.error(
    "second erase on same adminRoleCode should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.adminRoles.erase(
        connection,
        {
          adminRoleCode: createdRole.code,
        },
      );
    },
  );
}
