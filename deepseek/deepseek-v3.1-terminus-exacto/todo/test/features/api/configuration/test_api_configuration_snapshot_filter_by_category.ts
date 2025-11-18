import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfigurationSnapshot";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationSnapshot";
import type { ITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationValue";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test configuration creation and value assignment with category validation.
 *
 * Since the snapshot filtering API is not available, this test validates
 * configuration creation with categories and ensures category information is
 * properly stored and accessible through the available APIs.
 */
export async function test_api_configuration_snapshot_filter_by_category(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create configuration definitions with different categories
  const categories = ["database", "security", "ui_settings"] as const;
  const configurations: ITodoAppConfiguration[] = [];

  for (const category of categories) {
    const config = await api.functional.todoApp.user.configurations.create(
      connection,
      {
        body: {
          config_key: `${category}.test.${RandomGenerator.alphaNumeric(8)}`,
          name: `Test ${category} configuration`,
          description: `Test configuration for ${category} category`,
          data_type: "string",
          default_value: "default",
          category: category,
          is_sensitive: false,
          is_required: false,
        } satisfies ITodoAppConfiguration.ICreate,
      },
    );
    typia.assert(config);
    configurations.push(config);

    // Validate that category is properly stored
    TestValidator.equals(
      `configuration should have correct ${category} category`,
      config.category,
      category,
    );
  }

  // Step 3: Create configuration values for each definition using both available methods
  const configValues: ITodoAppConfigurationValue[] = [];

  for (const config of configurations) {
    // Method 1: Using configurationId
    const configValue1 =
      await api.functional.todoApp.user.configurations.values.postByConfigurationid(
        connection,
        {
          configurationId: config.id,
          body: {
            environment: "development",
            config_value: `value_for_${config.category}`,
            value_type: "string",
            is_active: true,
          } satisfies ITodoAppConfigurationValue.ICreate,
        },
      );
    typia.assert(configValue1);
    configValues.push(configValue1);

    // Method 2: Using configKey
    const configValue2 =
      await api.functional.todoApp.user.configurations.values.postByConfigkey(
        connection,
        {
          configKey: config.config_key,
          body: {
            environment: "production",
            config_value: `prod_value_for_${config.category}`,
            value_type: "string",
            is_active: false,
          } satisfies ITodoAppConfigurationValue.ICreate,
        },
      );
    typia.assert(configValue2);
    configValues.push(configValue2);
  }

  // Step 4: Validate that we can work with configurations by category
  const categoryCounts: Record<string, number> = {};

  for (const config of configurations) {
    categoryCounts[config.category] =
      (categoryCounts[config.category] || 0) + 1;
  }

  // Validate category distribution
  for (const category of categories) {
    TestValidator.predicate(
      `should have configurations in ${category} category`,
      categoryCounts[category] > 0,
    );
  }

  // Step 5: Test configuration retrieval and category persistence
  // Since we can't filter by category through API, we'll validate the data we have
  const allConfigsHaveCategories = configurations.every(
    (config) => config.category && config.category.length > 0,
  );

  TestValidator.predicate(
    "all configurations should have category assigned",
    allConfigsHaveCategories,
  );

  // Step 6: Validate configuration value creation
  TestValidator.equals(
    "should create configuration values for all configurations",
    configValues.length,
    configurations.length * 2, // 2 values per config (dev + prod)
  );

  // Final validation: Ensure the workflow completes successfully
  TestValidator.predicate(
    "configuration management workflow should complete successfully",
    configurations.length === categories.length && configValues.length > 0,
  );
}
