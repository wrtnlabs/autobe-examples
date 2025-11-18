import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";

/**
 * Ensure an authenticated admin can update an existing system configuration by
 * unique key
 *
 * This test validates that:
 *
 * 1. Only an authorized admin can update a global system configuration
 * 2. The config's value and/or description can be updated by the admin
 * 3. Audit fields are updated correctly and critical identifiers remain unchanged
 * 4. Timestamps for creation and update are correctly managed by the backend
 *
 * Workflow:
 *
 * 1. Admin is registered (joined) and authenticated
 * 2. Admin creates a new system configuration entry
 * 3. Admin updates the config with a new value and description using PUT by key
 * 4. It checks that the value and description are updated, id/key are unchanged,
 *    and updated_at is later
 * 5. Validates audit field consistency and system admin privilege enforcement
 */
export async function test_api_system_config_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // at least 8 chars
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoListAdmin.IJoin,
    });
  typia.assert(admin);
  TestValidator.equals("admin email match", admin.email, email);
  TestValidator.predicate("admin account is not locked", !admin.locked);

  // 2. Admin creates a new system config
  const configKey = `test_setting_${RandomGenerator.alphaNumeric(8)}`;
  const originalValue = RandomGenerator.alphaNumeric(10);
  const originalDescription = RandomGenerator.paragraph({ sentences: 4 });
  const createdConfig: ITodoListSystemConfig =
    await api.functional.todoList.admin.systemConfigs.create(connection, {
      body: {
        key: configKey,
        value: originalValue,
        description: originalDescription,
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(createdConfig);
  TestValidator.equals("config key matches", createdConfig.key, configKey);
  TestValidator.equals(
    "config value matches",
    createdConfig.value,
    originalValue,
  );
  TestValidator.equals(
    "config description matches",
    createdConfig.description,
    originalDescription,
  );
  const originalCreatedAt = createdConfig.created_at;
  const originalId = createdConfig.id;
  const originalUpdatedAt = createdConfig.updated_at;

  // 3. Admin updates the config by key
  const newValue = RandomGenerator.alphaNumeric(15);
  const newDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updatedConfig: ITodoListSystemConfig =
    await api.functional.todoList.admin.systemConfigs.putByKey(connection, {
      key: configKey,
      body: {
        value: newValue,
        description: newDescription,
      } satisfies ITodoListSystemConfig.IUpdate,
    });
  typia.assert(updatedConfig);

  // 4. Verify updated fields and audit trail
  TestValidator.equals(
    "config key remains unchanged",
    updatedConfig.key,
    configKey,
  );
  TestValidator.equals(
    "config id remains unchanged",
    updatedConfig.id,
    originalId,
  );
  TestValidator.notEquals(
    "updated value changed",
    updatedConfig.value,
    originalValue,
  );
  TestValidator.notEquals(
    "updated description changed",
    updatedConfig.description,
    originalDescription,
  );
  TestValidator.equals("updated value correct", updatedConfig.value, newValue);
  TestValidator.equals(
    "updated description correct",
    updatedConfig.description,
    newDescription,
  );

  // 5. Audit timestamps and integrity
  TestValidator.equals(
    "created_at unchanged",
    updatedConfig.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at after prior updated_at",
    new Date(updatedConfig.updated_at) > new Date(originalUpdatedAt),
  );
  TestValidator.equals("not soft-deleted", updatedConfig.deleted_at, null);
}
