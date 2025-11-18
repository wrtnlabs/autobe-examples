import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful retrieval of a specific configuration setting by
 * authenticated user.
 *
 * This test validates the complete workflow of user authentication,
 * configuration creation, and configuration retrieval. It ensures that
 * authenticated users can access their configuration settings correctly and
 * that all configuration details including timestamps and soft deletion status
 * are properly maintained.
 */
export async function test_api_configuration_retrieval_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create configuration setting to retrieve
  const configurationData = {
    key: `ui.theme.${RandomGenerator.alphaNumeric(6)}`,
    value: "dark",
    description:
      "Controls whether dark theme is enabled system-wide. Accepts true/false values.",
    category: "ui",
  } satisfies ITodoListConfiguration.ICreate;

  const createdConfiguration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: configurationData,
    });
  typia.assert(createdConfiguration);

  // Step 3: Retrieve the configuration using the exact key
  const retrievedConfiguration =
    await api.functional.todoList.user.configurations.at(connection, {
      configurationKey: configurationData.key,
    });
  typia.assert(retrievedConfiguration);

  // Step 4: Validate that configuration details match
  TestValidator.equals(
    "configuration key matches",
    retrievedConfiguration.key,
    configurationData.key,
  );
  TestValidator.equals(
    "configuration value matches",
    retrievedConfiguration.value,
    configurationData.value,
  );
  TestValidator.equals(
    "configuration description matches",
    retrievedConfiguration.description,
    configurationData.description,
  );
  TestValidator.equals(
    "configuration category matches",
    retrievedConfiguration.category,
    configurationData.category,
  );

  // Validate timestamps are properly set
  TestValidator.predicate(
    "created_at timestamp is valid",
    retrievedConfiguration.created_at !== null &&
      retrievedConfiguration.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    retrievedConfiguration.updated_at !== null &&
      retrievedConfiguration.updated_at !== undefined,
  );

  // Validate soft deletion field is properly initialized as undefined
  TestValidator.equals(
    "deleted_at is undefined for active configuration",
    retrievedConfiguration.deleted_at,
    undefined,
  );
}
