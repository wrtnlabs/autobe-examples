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
 * key.
 *
 * This scenario validates the configuration retrieval functionality where a
 * user registers, authenticates, and then accesses a specific configuration
 * setting using its unique key identifier. The test verifies that the
 * configuration data is returned with proper structure including key, value,
 * data_type, and category fields. It also validates that the response matches
 * the expected configuration schema.
 */
export async function test_api_configuration_retrieval_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: "placeholder_hash_that_will_be_replaced_by_server",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Authenticate the user to obtain valid access token
  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICredentials,
  });
  typia.assert(authenticatedUser);

  // Step 3: Retrieve a configuration setting using a specific key
  const configurationKey = "app.feature.enabled";
  const configuration = await api.functional.todoApp.user.configurations.at(
    connection,
    {
      configurationKey: configurationKey,
    },
  );
  typia.assert(configuration);

  // Step 4: Validate the configuration response structure
  TestValidator.equals(
    "configuration id should be string type",
    typeof configuration.id,
    "string",
  );
  TestValidator.equals(
    "configuration key should match requested key",
    configuration.key,
    configurationKey,
  );
  TestValidator.equals(
    "configuration value should be string type",
    typeof configuration.value,
    "string",
  );
  TestValidator.predicate(
    "configuration data_type should be valid",
    ["boolean", "number", "string", "json", "array"].includes(
      configuration.data_type,
    ),
  );
  TestValidator.equals(
    "configuration category should be string type",
    typeof configuration.category,
    "string",
  );
  TestValidator.equals(
    "configuration created_at should be string type",
    typeof configuration.created_at,
    "string",
  );
  TestValidator.equals(
    "configuration updated_at should be string type",
    typeof configuration.updated_at,
    "string",
  );

  // Validate that authentication context is properly maintained
  TestValidator.predicate(
    "user should be properly authenticated",
    authenticatedUser.token.access.length > 0,
  );
  TestValidator.equals(
    "authenticated user email should match",
    authenticatedUser.email,
    userEmail,
  );
}
