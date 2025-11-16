import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Test admin update of mall configuration by config key (including edge cases).
 *
 * 1. Register new admin (join)
 * 2. Use token to authorize the admin (auto-handled by SDK)
 * 3. Prepare a config entry to update: use update API directly with a config_key
 *    to simulate it existing
 * 4. Update config with new config_value, new description, and status transitions
 *    ("active" <-> "inactive", "active" -> "deprecated", etc)
 * 5. Assert that the update succeeded, updated fields match, and audit fields
 *    (updated_at) change
 * 6. Attempt update for already-deleted config entry (simulate deleted_at
 *    non-null): expect error
 */
export async function test_api_mall_configuration_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. (SDK auto-handles authentication after join)
  // 3. Prepare a unique config_key and initial config
  const configKey = RandomGenerator.alphaNumeric(12);
  // Prepare initial config using update API (simulate that entry exists)
  const initialUpdate =
    await api.functional.shoppingMall.admin.mallConfigurations.update(
      connection,
      {
        configKey,
        body: {
          config_value: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
        } satisfies IShoppingMallConfiguration.IUpdate,
      },
    );
  typia.assert(initialUpdate);

  // 4. Update config with new value, new description, status changed to 'inactive'
  const updated_value = RandomGenerator.content({ paragraphs: 1 });
  const updated_description = RandomGenerator.paragraph({ sentences: 4 });
  const updated_status: "inactive" = "inactive";
  const result =
    await api.functional.shoppingMall.admin.mallConfigurations.update(
      connection,
      {
        configKey,
        body: {
          config_value: updated_value,
          description: updated_description,
          status: updated_status,
        } satisfies IShoppingMallConfiguration.IUpdate,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "updated config_key matches",
    result.config_key,
    configKey,
  );
  TestValidator.equals(
    "updated config_value matches",
    result.config_value,
    updated_value,
  );
  TestValidator.equals(
    "updated description matches",
    result.description,
    updated_description,
  );
  TestValidator.equals("updated status matches", result.status, updated_status);
  TestValidator.notEquals(
    "updated_at changed after update",
    result.updated_at,
    initialUpdate.updated_at,
  );

  // 5. Update config to 'deprecated' and validate
  const deprecated_value = RandomGenerator.content({ paragraphs: 2 });
  const deprecated_description = RandomGenerator.paragraph({ sentences: 3 });
  const deprecated_status: "deprecated" = "deprecated";
  const deprecated_result =
    await api.functional.shoppingMall.admin.mallConfigurations.update(
      connection,
      {
        configKey,
        body: {
          config_value: deprecated_value,
          description: deprecated_description,
          status: deprecated_status,
        } satisfies IShoppingMallConfiguration.IUpdate,
      },
    );
  typia.assert(deprecated_result);
  TestValidator.equals(
    "status now deprecated",
    deprecated_result.status,
    "deprecated",
  );
  TestValidator.notEquals(
    "updated_at changed again",
    deprecated_result.updated_at,
    result.updated_at,
  );

  // 6. Simulate soft-deleted config (simulate by updating deleted_at then try update again and expect error)
  // This must be tested using the returned object; in real API soft-delete can be tested either by admin API (if exists) or by simulating directly.
  // Use the same config_key; backend is expected to reject further updates if deleted_at is set.
  // Here, forcibly simulate by setting deleted_at (if API rejects, TestValidator.error should catch it)
  // Since we cannot update deleted_at via the API contract, simulate by repeated update and expect OK, then for error case, use an obviously non-existent/deleted key
  const deletedKey = RandomGenerator.alphaNumeric(15);
  // Skip creation, go directly to update (should error: not found / soft-deleted)
  await TestValidator.error(
    "update on non-existent (deleted) config should fail",
    async () => {
      await api.functional.shoppingMall.admin.mallConfigurations.update(
        connection,
        {
          configKey: deletedKey,
          body: {
            config_value: RandomGenerator.content({ paragraphs: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            status: "active",
          } satisfies IShoppingMallConfiguration.IUpdate,
        },
      );
    },
  );
}
