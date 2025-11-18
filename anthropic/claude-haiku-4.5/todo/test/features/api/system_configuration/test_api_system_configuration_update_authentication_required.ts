import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfig";
import type { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that the update operation requires user authentication.
 *
 * This test verifies that updating a system configuration entry without valid
 * authentication credentials results in an authentication error. The test
 * creates a configuration entry, then attempts to update it using an
 * unauthenticated connection (without JWT token), ensuring the operation fails
 * with 401 Unauthorized.
 *
 * Workflow:
 *
 * 1. Create a user account to establish authenticated context
 * 2. Create a system configuration entry for testing
 * 3. Create an unauthenticated connection by clearing headers
 * 4. Attempt to update the configuration without authentication
 * 5. Verify the operation fails with 401 authentication error
 */
export async function test_api_system_configuration_update_authentication_required(
  connection: api.IConnection,
) {
  // Step 1: Create a user account via join endpoint
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const authenticatedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinData,
    });
  typia.assert(authenticatedUser);
  TestValidator.predicate(
    "user should be created with id",
    authenticatedUser.id !== undefined,
  );

  // Step 2: Create a system configuration entry
  const configData = {
    config_key: `test_config_${RandomGenerator.alphaNumeric(8)}`,
    config_value: "test_value",
    value_type: "string" as const,
    description: "Test configuration for authentication check",
  } satisfies ITodoListSystemConfig.ICreate;

  const createdConfig: ITodoListSystemConfig =
    await api.functional.todoList.systemConfigurations.create(connection, {
      body: configData,
    });
  typia.assert(createdConfig);
  TestValidator.equals(
    "created config key matches input",
    createdConfig.config_key,
    configData.config_key,
  );

  // Step 3: Create an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4 & 5: Attempt to update configuration without authentication
  await TestValidator.httpError(
    "update configuration should fail with 401 without authentication",
    401,
    async () => {
      await api.functional.todoList.user.systemConfigurations.update(
        unauthenticatedConnection,
        {
          configKey: createdConfig.config_key,
          body: {
            config_value: "updated_value",
            description: "Updated description",
          } satisfies ITodoListSystemConfiguration.IUpdate,
        },
      );
    },
  );

  TestValidator.predicate("authentication requirement enforced", true);
}
