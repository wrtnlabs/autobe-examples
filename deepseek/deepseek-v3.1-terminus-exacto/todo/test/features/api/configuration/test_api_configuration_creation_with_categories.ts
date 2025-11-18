import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test configuration creation with various category types to validate
 * categorization functionality.
 *
 * This E2E test validates that system configurations can be properly created
 * and categorized using different organizational groupings. It tests the
 * business logic for configuration organization and categorization
 * requirements, ensuring that the category field accepts different
 * organizational groupings and configurations can be properly managed.
 */
export async function test_api_configuration_creation_with_categories(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Define test categories and create configurations
  const categories = ["ui", "performance", "security", "features"] as const;

  for (const category of categories) {
    // Create configuration with specific category
    const configuration =
      await api.functional.todolist.user.configurations.create(connection, {
        body: {
          key: `${category}.setting.${RandomGenerator.alphaNumeric(8)}`,
          value: RandomGenerator.paragraph({ sentences: 2 }),
          description: `Configuration setting for ${category} category`,
          category: category,
        } satisfies ITodoListConfiguration.ICreate,
      });
    typia.assert(configuration);

    // Validate category assignment
    TestValidator.equals(
      `configuration category should be ${category}`,
      configuration.category,
      category,
    );

    // Validate key structure follows hierarchical naming convention
    TestValidator.predicate(
      "configuration key should follow hierarchical naming convention",
      configuration.key.includes(".") && configuration.key.length > 0,
    );
  }

  // Step 3: Test configuration without category (optional field)
  const configurationWithoutCategory =
    await api.functional.todolist.user.configurations.create(connection, {
      body: {
        key: `uncategorized.setting.${RandomGenerator.alphaNumeric(8)}`,
        value: "uncategorized setting value",
        description: "Configuration without category assignment",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configurationWithoutCategory);

  // Validate that category is undefined when not provided
  TestValidator.equals(
    "configuration without category should have undefined category",
    configurationWithoutCategory.category,
    undefined,
  );
}
