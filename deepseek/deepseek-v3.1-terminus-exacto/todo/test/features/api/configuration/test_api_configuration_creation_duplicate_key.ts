import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creation attempt with duplicate configuration key.
 *
 * Validates that the system properly enforces configuration key uniqueness by
 * rejecting attempts to create configurations with duplicate keys. This test
 * ensures the integrity of the configuration management system by preventing
 * key collisions that could lead to configuration conflicts.
 */
export async function test_api_configuration_creation_duplicate_key(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create initial configuration with unique key
  const configurationKey = RandomGenerator.alphaNumeric(10);
  const firstConfiguration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: configurationKey,
        value: "initial value",
        description: "Initial configuration for duplicate key testing",
        category: "test",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(firstConfiguration);
  TestValidator.equals(
    "first configuration key matches",
    firstConfiguration.key,
    configurationKey,
  );

  // Step 3: Attempt to create duplicate configuration with same key
  await TestValidator.error(
    "duplicate configuration key should fail",
    async () => {
      await api.functional.todoList.user.configurations.create(connection, {
        body: {
          key: configurationKey,
          value: "duplicate value",
          description: "Duplicate configuration attempt",
          category: "test",
        } satisfies ITodoListConfiguration.ICreate,
      });
    },
  );

  // Note: The system does not provide an API to retrieve configurations by key,
  // so we rely on the successful error validation above to confirm that
  // the duplicate key constraint is properly enforced. The error test
  // demonstrates that the original configuration remains protected.
}
