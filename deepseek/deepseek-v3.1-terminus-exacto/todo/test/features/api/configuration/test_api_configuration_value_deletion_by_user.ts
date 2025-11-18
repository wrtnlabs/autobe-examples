import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationValue";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test soft deletion of an environment-specific configuration value by an
 * authenticated user.
 *
 * This test validates the configuration value deletion endpoint. Since the
 * provided API functions don't include a way to create configuration values,
 * this test focuses on validating the deletion operation's behavior with
 * various input scenarios.
 */
export async function test_api_configuration_value_deletion_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test deletion with valid but likely non-existent configuration
  // Since we can't create configuration values, test the API contract
  const configKey = RandomGenerator.alphaNumeric(10);
  const environment = RandomGenerator.pick([
    "development",
    "staging",
    "production",
  ] as const);

  const deletedValue =
    await api.functional.todoApp.user.configurations.values.erase(connection, {
      configKey: configKey,
      environment: environment,
    });
  typia.assert(deletedValue);

  // Validate the response structure matches ITodoAppConfigurationValue
  TestValidator.equals(
    "response should have environment field",
    deletedValue.environment,
    environment,
  );
  TestValidator.predicate(
    "response should have valid UUID id",
    /^[0-9a-f-]{36}$/i.test(deletedValue.id),
  );
  TestValidator.predicate(
    "response should have config_value field",
    typeof deletedValue.config_value === "string",
  );
  TestValidator.predicate(
    "response should have value_type field",
    typeof deletedValue.value_type === "string",
  );
  TestValidator.predicate(
    "response should have is_active field",
    typeof deletedValue.is_active === "boolean",
  );
  TestValidator.predicate(
    "response should have created_at timestamp",
    typeof deletedValue.created_at === "string",
  );
  TestValidator.predicate(
    "response should have updated_at timestamp",
    typeof deletedValue.updated_at === "string",
  );

  // Step 3: Test error scenario with invalid configuration key
  await TestValidator.error(
    "should handle invalid configuration key format",
    async () => {
      await api.functional.todoApp.user.configurations.values.erase(
        connection,
        {
          configKey: "", // Empty config key should trigger validation error
          environment: environment,
        },
      );
    },
  );

  // Step 4: Test error scenario with invalid environment
  await TestValidator.error(
    "should handle invalid environment format",
    async () => {
      await api.functional.todoApp.user.configurations.values.erase(
        connection,
        {
          configKey: configKey,
          environment: "", // Empty environment should trigger validation error
        },
      );
    },
  );
}
