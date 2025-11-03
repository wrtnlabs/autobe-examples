import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test updating a non-system configuration setting by a user.
 *
 * This test validates the complete workflow for configuration management:
 *
 * 1. User registration and authentication
 * 2. Creation of a non-system configuration setting
 * 3. Successful update of the configuration
 * 4. Verification of the updated values
 *
 * The test ensures that users can modify non-system configurations while
 * system-level configurations remain protected, demonstrating proper
 * authorization controls in the todo application.
 */
export async function test_api_configuration_update_non_system(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to establish authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a non-system configuration setting
  const configKey = `user_setting_${RandomGenerator.alphaNumeric(8)}`;
  const originalConfig = await api.functional.todo.configurations.create(
    connection,
    {
      body: {
        key: configKey,
        value: "original_value",
        type: "string",
        description: "Original configuration description",
        is_system: false, // Non-system configuration that users can modify
      } satisfies ITodoConfiguration.ICreate,
    },
  );
  typia.assert(originalConfig);

  TestValidator.equals(
    "configuration should not be system-level",
    originalConfig.is_system,
    false,
  );
  TestValidator.equals(
    "initial value should match",
    originalConfig.value,
    "original_value",
  );
  TestValidator.equals(
    "initial description should match",
    originalConfig.description,
    "Original configuration description",
  );

  // Step 3: Update the configuration with new values
  const updatedValue = "updated_value_" + RandomGenerator.alphaNumeric(5);
  const updatedDescription =
    "Updated configuration description - " +
    RandomGenerator.paragraph({ sentences: 2 });

  const updatedConfig = await api.functional.todo.configurations.update(
    connection,
    {
      id: originalConfig.id,
      body: {
        value: updatedValue,
        description: updatedDescription,
      } satisfies ITodoConfiguration.IUpdate,
    },
  );
  typia.assert(updatedConfig);

  // Step 4: Verify the update was successful
  TestValidator.equals(
    "updated value should match",
    updatedConfig.value,
    updatedValue,
  );
  TestValidator.equals(
    "updated description should match",
    updatedConfig.description,
    updatedDescription,
  );
  TestValidator.equals(
    "configuration ID should remain the same",
    updatedConfig.id,
    originalConfig.id,
  );
  TestValidator.equals(
    "key should remain the same",
    updatedConfig.key,
    originalConfig.key,
  );
  TestValidator.equals(
    "type should remain the same",
    updatedConfig.type,
    originalConfig.type,
  );
  TestValidator.equals(
    "is_system should remain the same",
    updatedConfig.is_system,
    false,
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedConfig.updated_at).getTime() >
      new Date(updatedConfig.created_at).getTime(),
  );

  // Step 5: Test partial update (only description)
  const partialUpdateDescription = "Partially updated description";
  const partiallyUpdatedConfig =
    await api.functional.todo.configurations.update(connection, {
      id: originalConfig.id,
      body: {
        description: partialUpdateDescription,
      } satisfies ITodoConfiguration.IUpdate,
    });
  typia.assert(partiallyUpdatedConfig);

  TestValidator.equals(
    "value should remain after partial update",
    partiallyUpdatedConfig.value,
    updatedValue,
  );
  TestValidator.equals(
    "description should be updated",
    partiallyUpdatedConfig.description,
    partialUpdateDescription,
  );
}
