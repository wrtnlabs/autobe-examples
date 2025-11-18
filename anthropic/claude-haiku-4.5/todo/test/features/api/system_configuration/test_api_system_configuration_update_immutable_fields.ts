import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that immutable fields (id, config_key, created_at, value_type) cannot be
 * modified through the update operation.
 *
 * This test creates a system configuration entry and then attempts to update
 * it. The test verifies that certain fields remain immutable:
 *
 * - Id: Primary key should never change
 * - Config_key: Configuration key identifier should never change
 * - Created_at: Creation timestamp should never change
 * - Value_type: Data type specification should never change
 *
 * While these fields are immutable, the following fields should be updatable:
 *
 * - Config_value: The actual configuration value
 * - Description: Human-readable description
 * - Version: Auto-incremented on updates
 * - Updated_at: Updated timestamp
 *
 * Steps:
 *
 * 1. Authenticate user
 * 2. Create initial system configuration
 * 3. Update the configuration value
 * 4. Verify immutable fields remained unchanged
 * 5. Verify mutable fields were updated
 */
export async function test_api_system_configuration_update_immutable_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create initial system configuration
  const configKey = RandomGenerator.alphabets(10);
  const originalValue = "1000";
  const originalValueType: "string" | "integer" | "boolean" | "float" =
    "integer";
  const originalDescription = RandomGenerator.paragraph();

  const created: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: {
        config_key: configKey,
        config_value: originalValue,
        value_type: originalValueType,
        description: originalDescription,
      } satisfies ITodoListSystemConfig.ICreate,
    });
  typia.assert(created);

  // Store immutable field values for later verification
  const originalId = created.id;
  const originalConfigKey = created.config_key;
  const originalCreatedAt = created.created_at;
  const originalValueTypeStored = created.value_type;
  const originalVersion = created.version;

  // Step 3: Update the configuration value
  const newValue = "2000";
  const newDescription = RandomGenerator.paragraph();

  const updated: ITodoListSystemConfiguration =
    await api.functional.todoList.user.systemConfigurations.update(connection, {
      configKey: configKey,
      body: {
        config_value: newValue,
        description: newDescription,
      } satisfies ITodoListSystemConfiguration.IUpdate,
    });
  typia.assert(updated);

  // Step 4: Verify immutable fields remained unchanged
  TestValidator.equals("id should remain immutable", updated.id, originalId);
  TestValidator.equals(
    "config_key should remain immutable",
    updated.config_key,
    originalConfigKey,
  );
  TestValidator.equals(
    "created_at should remain immutable",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "value_type should remain immutable",
    updated.value_type,
    originalValueTypeStored,
  );

  // Step 5: Verify mutable fields were updated
  TestValidator.equals(
    "config_value should be updated",
    updated.config_value,
    newValue,
  );
  TestValidator.equals(
    "description should be updated",
    updated.description,
    newDescription,
  );

  // Step 6: Verify version incremented
  TestValidator.predicate(
    "version should increment after update",
    updated.version > originalVersion,
  );

  // Verify updated_at is more recent than created_at
  const createdTime = new Date(originalCreatedAt).getTime();
  const updatedTime = new Date(updated.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be after created_at",
    updatedTime >= createdTime,
  );
}
