import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IConfigurationDataType";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that authenticated users can retrieve specific configuration settings by
 * their unique key identifier.
 *
 * This test validates the complete workflow:
 *
 * 1. Create a new user account to establish authentication context
 * 2. Authenticate the user to obtain valid authorization tokens
 * 3. Retrieve a configuration setting using the authenticated connection
 * 4. Validate the returned configuration data structure and properties
 *
 * The test ensures that configuration retrieval respects user authentication
 * requirements and returns complete configuration details including value,
 * description, data type, and metadata.
 */
export async function test_api_configuration_retrieval_by_user(
  connection: api.IConnection,
) {
  // 1. Create a new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword, // Let server handle hashing logic
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: undefined,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Authenticate the user to obtain valid authorization tokens
  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/login",
      ip: "127.0.0.1",
    } satisfies ITodoAppUser.ICredentials,
  });
  typia.assert(authenticatedUser);

  // 3. Retrieve a configuration setting using the authenticated connection
  const configurationKey = RandomGenerator.alphaNumeric(10);
  const configuration = await api.functional.todoApp.configurations.at(
    connection,
    {
      configurationKey: configurationKey,
    },
  );
  typia.assert(configuration);

  // 4. Validate the returned configuration data structure
  await TestValidator.equals(
    "configuration key matches request",
    configuration.key,
    configurationKey,
  );
  await TestValidator.equals(
    "configuration has valid UUID id",
    typeof configuration.id,
    "string",
  );
  await TestValidator.equals(
    "configuration value is present",
    typeof configuration.value,
    "string",
  );
  await TestValidator.equals(
    "configuration data type is valid",
    ["boolean", "number", "string", "json", "array"].includes(
      configuration.data_type,
    ),
    true,
  );
  await TestValidator.equals(
    "configuration category is present",
    typeof configuration.category,
    "string",
  );
  await TestValidator.equals(
    "configuration created_at is valid date",
    typeof configuration.created_at,
    "string",
  );
  await TestValidator.equals(
    "configuration updated_at is valid date",
    typeof configuration.updated_at,
    "string",
  );

  // Validate optional description field if present
  if (configuration.description !== undefined) {
    await TestValidator.equals(
      "description is string when present",
      typeof configuration.description,
      "string",
    );
  }
}
