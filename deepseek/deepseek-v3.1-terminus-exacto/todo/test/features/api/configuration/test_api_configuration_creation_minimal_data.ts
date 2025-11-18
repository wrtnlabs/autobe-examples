import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test creation of configuration with only required fields (key and value).
 *
 * This test validates that the configuration creation API correctly handles
 * minimal data input by omitting optional fields (description and category).
 * The workflow involves user registration for authentication context followed
 * by creating a configuration entry with only mandatory fields. The test
 * verifies that optional fields are properly handled with null/undefined values
 * and that system-generated fields (ID, timestamps) are correctly populated.
 */
export async function test_api_configuration_creation_minimal_data(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context for configuration operations
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create configuration with minimal required fields only
  const configurationKey = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const configurationValue = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });

  const configuration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: configurationKey,
        value: configurationValue,
        // Intentionally omit description and category fields to test minimal data handling
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Step 3: Validate the created configuration matches input data
  TestValidator.equals(
    "configuration key matches input",
    configuration.key,
    configurationKey,
  );
  TestValidator.equals(
    "configuration value matches input",
    configuration.value,
    configurationValue,
  );

  // Step 4: Validate optional fields are properly handled (should be undefined)
  TestValidator.equals(
    "description field should be undefined",
    configuration.description,
    undefined,
  );
  TestValidator.equals(
    "category field should be undefined",
    configuration.category,
    undefined,
  );

  // Step 5: Validate system-generated fields are populated (typia.assert already validated types)
  TestValidator.predicate(
    "configuration ID should not be empty",
    configuration.id.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp should not be empty",
    configuration.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should not be empty",
    configuration.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be undefined for active configuration",
    configuration.deleted_at,
    undefined,
  );
}
