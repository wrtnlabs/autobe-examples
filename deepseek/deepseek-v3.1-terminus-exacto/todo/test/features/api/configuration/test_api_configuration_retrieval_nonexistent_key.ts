import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IConfigurationDataType";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the error handling when attempting to retrieve a configuration setting
 * with a non-existent key. This scenario validates that the API properly
 * handles requests for configuration keys that don't exist in the system. The
 * test should verify that appropriate error responses are returned with clear
 * status codes and error messages, ensuring robust error handling for malformed
 * or incorrect configuration key requests.
 */
export async function test_api_configuration_retrieval_nonexistent_key(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword, // Using same password for simplicity in test
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "active" as const,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Authenticate the user to establish valid credentials
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/login",
    } satisfies ITodoAppUser.ICredentials,
  });

  // Step 3: Attempt to retrieve a configuration setting using a non-existent key
  const nonExistentKey = RandomGenerator.alphaNumeric(20);

  await TestValidator.error(
    "retrieving non-existent configuration key should fail",
    async () => {
      await api.functional.todoApp.user.configurations.at(connection, {
        configurationKey: nonExistentKey,
      });
    },
  );
}
