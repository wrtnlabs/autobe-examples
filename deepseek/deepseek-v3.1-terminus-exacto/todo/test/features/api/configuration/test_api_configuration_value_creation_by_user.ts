import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationValue";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test creation of environment-specific configuration values by authenticated
 * users.
 *
 * Validates that users can create configuration overrides for specific
 * deployment environments (development, staging, production) with proper data
 * type validation and activation states. Tests the complete workflow from user
 * authentication to configuration definition creation and environment-specific
 * value assignment.
 */
export async function test_api_configuration_value_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create configuration definition
  const configuration = await api.functional.todoApp.user.configurations.create(
    connection,
    {
      body: {
        config_key: "app.feature.enable_notifications",
        name: "Enable Notifications",
        description: "Controls whether notification features are enabled",
        data_type: "boolean",
        default_value: "false",
        category: "feature",
        is_sensitive: false,
        is_required: true,
      } satisfies ITodoAppConfiguration.ICreate,
    },
  );
  typia.assert(configuration);

  // Step 3: Create development environment configuration value
  const devValue =
    await api.functional.todoApp.user.configurations.values.postByConfigurationid(
      connection,
      {
        configurationId: configuration.id,
        body: {
          environment: "development",
          config_value: "true",
          value_type: "boolean",
          is_active: true,
        } satisfies ITodoAppConfigurationValue.ICreate,
      },
    );
  typia.assert(devValue);
  TestValidator.equals(
    "development value matches input",
    devValue.config_value,
    "true",
  );
  TestValidator.equals(
    "development environment matches",
    devValue.environment,
    "development",
  );

  // Step 4: Create staging environment configuration value
  const stagingValue =
    await api.functional.todoApp.user.configurations.values.postByConfigurationid(
      connection,
      {
        configurationId: configuration.id,
        body: {
          environment: "staging",
          config_value: "false",
          value_type: "boolean",
          is_active: false,
        } satisfies ITodoAppConfigurationValue.ICreate,
      },
    );
  typia.assert(stagingValue);
  TestValidator.equals(
    "staging value matches input",
    stagingValue.config_value,
    "false",
  );
  TestValidator.equals(
    "staging environment matches",
    stagingValue.environment,
    "staging",
  );

  // Step 5: Create production environment configuration value
  const productionValue =
    await api.functional.todoApp.user.configurations.values.postByConfigurationid(
      connection,
      {
        configurationId: configuration.id,
        body: {
          environment: "production",
          config_value: "true",
          value_type: "boolean",
          is_active: true,
        } satisfies ITodoAppConfigurationValue.ICreate,
      },
    );
  typia.assert(productionValue);
  TestValidator.equals(
    "production value matches input",
    productionValue.config_value,
    "true",
  );
  TestValidator.equals(
    "production environment matches",
    productionValue.environment,
    "production",
  );

  // Step 6: Validate that different environments have independent values
  TestValidator.notEquals(
    "dev and staging values differ",
    devValue.config_value,
    stagingValue.config_value,
  );
  TestValidator.equals(
    "dev and production values match",
    devValue.config_value,
    productionValue.config_value,
  );
}
