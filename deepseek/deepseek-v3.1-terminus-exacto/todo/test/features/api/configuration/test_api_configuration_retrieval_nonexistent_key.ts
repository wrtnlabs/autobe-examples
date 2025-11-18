import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval attempt for a non-existent configuration key.
 *
 * User registers and attempts to retrieve a configuration with a key that
 * doesn't exist. Validates proper error handling and response when
 * configuration key is not found in the system.
 */
export async function test_api_configuration_retrieval_nonexistent_key(
  connection: api.IConnection,
) {
  // 1. Create authenticated user context by registering a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // 2. Attempt to retrieve a configuration using a non-existent key
  const nonExistentKey = RandomGenerator.alphabets(10);

  // 3. Validate that the API call fails with an error
  await TestValidator.error(
    "retrieving non-existent configuration should fail",
    async () => {
      await api.functional.todoList.user.configurations.at(connection, {
        configurationKey: nonExistentKey,
      });
    },
  );
}
