import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Test that an administrator can permanently delete a shopping mall system
 * configuration by its unique configuration ID.
 *
 * The test ensures the admin is authenticated using the admin join endpoint
 * first. Then it creates a new configuration to be deleted. It verifies that
 * deletion of an existing configuration is successful. It also attempts to
 * delete a non-existent configuration to check error handling.
 *
 * This validates authorization, existence validation, and the hard delete
 * behavior.
 */
export async function test_api_shoppingmall_configuration_erase_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (authenticates) to obtain authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new shopping mall configuration to be deleted
  const newConfig: IShoppingMallConfiguration =
    await api.functional.shoppingMall.shoppingMall.configurations.create(
      connection,
      {
        body: {
          key: `test_key_${RandomGenerator.alphaNumeric(8)}`,
          value: RandomGenerator.alphaNumeric(16),
          category: "test_category",
          description: "Temporary configuration for deletion test",
          enabled: true,
        } satisfies IShoppingMallConfiguration.ICreate,
      },
    );
  typia.assert(newConfig);

  // 3. Delete the created configuration by configurationId
  await api.functional.shoppingMall.admin.shoppingMall.configurations.erase(
    connection,
    {
      configurationId: newConfig.id,
    },
  );

  // 4. Attempt to delete a non-existent configuration and expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent configuration should fail",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMall.configurations.erase(
        connection,
        {
          configurationId: nonExistentId,
        },
      );
    },
  );
}
