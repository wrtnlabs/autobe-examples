import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creation of configuration with category grouping.
 *
 * This E2E test validates that authenticated users can create system
 * configurations with specific categories (e.g., 'ui', 'performance',
 * 'security') and that the category field is properly stored and can be used
 * for organizational purposes in configuration management.
 */
export async function test_api_configuration_creation_with_category(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Generate realistic configuration data with specific category
  const categories = ["ui", "performance", "security", "features"] as const;
  const selectedCategory = RandomGenerator.pick(categories);

  const configurationData = {
    key: `config.${selectedCategory}.${RandomGenerator.alphaNumeric(8)}`,
    value: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category: selectedCategory,
  } satisfies ITodoListConfiguration.ICreate;

  // Step 3: Create configuration with category
  const configuration: ITodoListConfiguration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: configurationData,
    });
  typia.assert(configuration);

  // Step 4: Validate configuration creation
  TestValidator.equals(
    "configuration key matches input",
    configuration.key,
    configurationData.key,
  );
  TestValidator.equals(
    "configuration value matches input",
    configuration.value,
    configurationData.value,
  );
  TestValidator.equals(
    "configuration description matches input",
    configuration.description,
    configurationData.description,
  );
  TestValidator.equals(
    "configuration category matches input",
    configuration.category,
    configurationData.category,
  );

  // Additional validation: Test creating configuration without category
  const configurationWithoutCategoryData = {
    key: `config.general.${RandomGenerator.alphaNumeric(8)}`,
    value: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    // category is optional and can be undefined
  } satisfies ITodoListConfiguration.ICreate;

  const configurationWithoutCategory: ITodoListConfiguration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: configurationWithoutCategoryData,
    });
  typia.assert(configurationWithoutCategory);

  TestValidator.equals(
    "configuration without category has undefined category",
    configurationWithoutCategory.category,
    undefined,
  );
}
