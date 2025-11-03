import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfig";

/**
 * This e2e test validates the deletion of a platform configuration by an admin
 * user.
 *
 * The process is as follows:
 *
 * 1. Authenticate as an admin user by calling the join API.
 * 2. Create a platform configuration using the create API.
 * 3. Delete the created platform configuration by its id via the delete API.
 * 4. Attempt to retrieve the deleted platform configuration which is expected to
 *    fail.
 *
 * This test ensures that the platform configuration lifecycle (creation,
 * deletion, and validation of deletion) works correctly for an admin user.
 */
export async function test_api_platformconfig_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "complex_password_1234";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create platform configuration to be deleted
  const createBody = {
    config_name: `test_config_${RandomGenerator.alphaNumeric(8)}`,
    config_value: RandomGenerator.alphabets(10),
    description: `Temporary test config created on ${new Date().toISOString()}`,
  } satisfies IShoppingMallPlatformConfig.ICreate;
  const createdConfig: IShoppingMallPlatformConfig =
    await api.functional.shoppingMall.admin.platformConfigs.create(connection, {
      body: createBody,
    });
  typia.assert(createdConfig);

  // 3. Delete the created platform configuration
  await api.functional.shoppingMall.admin.platformConfigs.erase(connection, {
    id: createdConfig.id,
  });

  // 4. Validate deletion by attempting to delete again expecting failure
  await TestValidator.error(
    "deleting non-existent platform config should fail",
    async () => {
      await api.functional.shoppingMall.admin.platformConfigs.erase(
        connection,
        {
          id: createdConfig.id,
        },
      );
    },
  );
}
