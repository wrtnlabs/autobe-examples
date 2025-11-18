import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test configuration creation and retrieval functionality.
 *
 * This test validates the complete workflow of creating and retrieving
 * configuration settings. The original scenario requested testing soft-deleted
 * configuration retrieval, but since no delete endpoint exists in the provided
 * API functions, this test focuses on the available functionality:
 *
 * 1. User registration and authentication
 * 2. Configuration creation with a unique key
 * 3. Retrieval and validation of the created configuration
 *
 * The test ensures that configurations can be properly created and retrieved
 * with all metadata intact.
 */
export async function test_api_configuration_retrieval_soft_deleted(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a configuration setting
  const configurationKey = `test.config.${RandomGenerator.alphaNumeric(8)}`;
  const configuration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: configurationKey,
        value: "test configuration value",
        description: "Test configuration for retrieval validation",
        category: "test",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Step 3: Retrieve the configuration and validate it's accessible
  const retrievedConfig = await api.functional.todoList.user.configurations.at(
    connection,
    {
      configurationKey: configurationKey,
    },
  );
  typia.assert(retrievedConfig);

  // Validate the configuration data matches exactly
  TestValidator.equals(
    "configuration ID matches",
    retrievedConfig.id,
    configuration.id,
  );
  TestValidator.equals(
    "configuration key matches",
    retrievedConfig.key,
    configurationKey,
  );
  TestValidator.equals(
    "configuration value matches",
    retrievedConfig.value,
    "test configuration value",
  );
  TestValidator.equals(
    "configuration description matches",
    retrievedConfig.description,
    "Test configuration for retrieval validation",
  );
  TestValidator.equals(
    "configuration category matches",
    retrievedConfig.category,
    "test",
  );

  // Validate timestamps are properly set
  TestValidator.predicate(
    "created_at timestamp is set",
    retrievedConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    retrievedConfig.updated_at !== undefined,
  );

  // Note: Since there's no delete functionality available, we cannot test soft deletion
  // The original scenario requirement for testing soft-deleted configurations is not feasible
  // with the provided API functions
}
