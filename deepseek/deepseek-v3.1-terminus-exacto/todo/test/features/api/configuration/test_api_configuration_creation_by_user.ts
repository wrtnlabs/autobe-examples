import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful creation of a new configuration setting by authenticated
 * user.
 *
 * This test validates the complete workflow of creating a system configuration
 * through the authenticated user API. It ensures that:
 *
 * - User authentication is properly established
 * - Configuration data is correctly stored with all provided fields
 * - System-generated fields (ID, timestamps) are properly set
 * - The response matches the expected data structure
 *
 * The test follows a realistic business scenario where a user registers,
 * authenticates, and then creates a configuration setting for the todo list
 * application.
 */
export async function test_api_configuration_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "TestPassword123";

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

  // Step 2: Create configuration with realistic test data
  const configurationData = {
    key: "ui.theme.dark",
    value: "true",
    description: "Controls whether dark theme is enabled system-wide",
    category: "ui",
  } satisfies ITodoListConfiguration.ICreate;

  const configuration: ITodoListConfiguration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: configurationData,
    });
  typia.assert(configuration);

  // Step 3: Validate response contains all provided data
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

  // Step 4: Verify system-generated fields (business logic validation only)
  TestValidator.predicate(
    "deleted_at is undefined for new configuration",
    configuration.deleted_at === undefined,
  );

  // Step 5: Additional validation to ensure successful creation
  TestValidator.predicate(
    "created_at and updated_at should be identical for new configuration",
    configuration.created_at === configuration.updated_at,
  );
}
