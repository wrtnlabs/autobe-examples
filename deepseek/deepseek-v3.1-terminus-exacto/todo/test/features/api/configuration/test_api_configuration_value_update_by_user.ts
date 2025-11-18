import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationValue";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating an environment-specific configuration value by an authenticated
 * user.
 *
 * This test validates the complete workflow of configuration value management:
 *
 * 1. User authentication and authorization setup
 * 2. Configuration definition creation
 * 3. Environment-specific value creation and updates
 * 4. Value type and active status modifications
 * 5. Referential integrity validation
 * 6. Timestamp tracking verification
 */
export async function test_api_configuration_value_update_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const userName = RandomGenerator.name();

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        name: userName,
        href: "https://example.com/test",
        referrer: "https://example.com",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create a configuration definition
  const configKey = `test.${RandomGenerator.alphaNumeric(8)}.setting`;
  const configName = RandomGenerator.paragraph({ sentences: 3 });
  const configDescription = RandomGenerator.content({ paragraphs: 1 });

  const configuration: ITodoAppConfiguration =
    await api.functional.todoApp.user.configurations.create(connection, {
      body: {
        config_key: configKey,
        name: configName,
        description: configDescription,
        data_type: "string",
        default_value: "default_value",
        validation_rules: null,
        category: "test",
        is_sensitive: false,
        is_required: false,
      } satisfies ITodoAppConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Step 3: Create initial configuration value for development environment
  const initialConfigValue: ITodoAppConfigurationValue =
    await api.functional.todoApp.user.configurations.values.update(connection, {
      configKey: configKey,
      environment: "development",
      body: {
        config_value: "initial_value",
        value_type: "string",
        is_active: true,
      } satisfies ITodoAppConfigurationValue.IUpdate,
    });
  typia.assert(initialConfigValue);

  // Step 4: Update configuration value - modify the value
  const updatedValue: ITodoAppConfigurationValue =
    await api.functional.todoApp.user.configurations.values.update(connection, {
      configKey: configKey,
      environment: "development",
      body: {
        config_value: "updated_value",
      } satisfies ITodoAppConfigurationValue.IUpdate,
    });
  typia.assert(updatedValue);

  // Validate that the value was updated
  TestValidator.equals(
    "config value should be updated",
    updatedValue.config_value,
    "updated_value",
  );
  TestValidator.equals(
    "value type should remain unchanged",
    updatedValue.value_type,
    "string",
  );
  TestValidator.equals(
    "active status should remain unchanged",
    updatedValue.is_active,
    true,
  );

  // Step 5: Update configuration value - change value type
  const typeUpdatedValue: ITodoAppConfigurationValue =
    await api.functional.todoApp.user.configurations.values.update(connection, {
      configKey: configKey,
      environment: "development",
      body: {
        value_type: "json",
      } satisfies ITodoAppConfigurationValue.IUpdate,
    });
  typia.assert(typeUpdatedValue);

  // Validate that the value type was updated
  TestValidator.equals(
    "value type should be updated to json",
    typeUpdatedValue.value_type,
    "json",
  );
  TestValidator.equals(
    "config value should remain unchanged",
    typeUpdatedValue.config_value,
    "updated_value",
  );

  // Step 6: Update configuration value - toggle active status
  const statusUpdatedValue: ITodoAppConfigurationValue =
    await api.functional.todoApp.user.configurations.values.update(connection, {
      configKey: configKey,
      environment: "development",
      body: {
        is_active: false,
      } satisfies ITodoAppConfigurationValue.IUpdate,
    });
  typia.assert(statusUpdatedValue);

  // Validate that the active status was updated
  TestValidator.equals(
    "active status should be updated to false",
    statusUpdatedValue.is_active,
    false,
  );
  TestValidator.equals(
    "config value should remain unchanged",
    statusUpdatedValue.config_value,
    "updated_value",
  );
  TestValidator.equals(
    "value type should remain unchanged",
    statusUpdatedValue.value_type,
    "json",
  );

  // Step 7: Verify timestamp tracking
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(statusUpdatedValue.updated_at) >
      new Date(statusUpdatedValue.created_at),
  );

  // Step 8: Create configuration value for different environment
  const productionValue: ITodoAppConfigurationValue =
    await api.functional.todoApp.user.configurations.values.update(connection, {
      configKey: configKey,
      environment: "production",
      body: {
        config_value: "production_value",
        value_type: "string",
        is_active: true,
      } satisfies ITodoAppConfigurationValue.IUpdate,
    });
  typia.assert(productionValue);

  // Validate environment-specific values are independent
  TestValidator.notEquals(
    "development and production values should be different",
    statusUpdatedValue.config_value,
    productionValue.config_value,
  );
  TestValidator.notEquals(
    "development and production environments should be different",
    statusUpdatedValue.environment,
    productionValue.environment,
  );
}
