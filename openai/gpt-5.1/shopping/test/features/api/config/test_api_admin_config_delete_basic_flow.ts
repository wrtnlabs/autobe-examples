import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";

/**
 * Validate that an authenticated admin can delete a configuration entry and
 * that subsequent operations against the same id fail as the record no longer
 * exists.
 *
 * Business flow:
 *
 * 1. Admin joins (POST /auth/admin/join) and is automatically authenticated on the
 *    shared connection via Authorization header wiring.
 * 2. Admin creates a configuration (POST /shoppingMall/admin/configs).
 * 3. Admin deletes that configuration (DELETE
 *    /shoppingMall/admin/configs/{configId}).
 * 4. A second delete attempt for the same configId must result in an error,
 *    demonstrating hard delete semantics / 404-style behavior.
 */
export async function test_api_admin_config_delete_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a configuration that we will later delete
  const configCreateBody = typia.random<IShoppingMallConfig.ICreate>();

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configCreateBody,
    });
  typia.assert(createdConfig);

  // 3. Delete the configuration once (should succeed)
  await api.functional.shoppingMall.admin.configs.erase(connection, {
    configId: createdConfig.id,
  });

  // 4. Try deleting the same configuration again and expect an error
  await TestValidator.error(
    "re-deleting already erased config should fail",
    async () => {
      await api.functional.shoppingMall.admin.configs.erase(connection, {
        configId: createdConfig.id,
      });
    },
  );
}
