import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the complete workflow of retrieving a specific configuration definition
 * by its unique key.
 *
 * This scenario validates that authenticated users can successfully retrieve
 * configuration details including metadata, validation rules, and default
 * values. The test verifies that all configuration properties are returned
 * correctly, including system-generated fields like ID, version, and
 * timestamps. It ensures the response matches the expected schema and contains
 * all necessary information for configuration management.
 */
export async function test_api_configuration_retrieval_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

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

  // Step 2: Create a configuration definition for testing retrieval
  const configurationData = {
    config_key: `test.category.setting_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    data_type: "string",
    default_value: "default_value",
    validation_rules: JSON.stringify({ minLength: 1, maxLength: 100 }),
    category: "test",
    is_sensitive: false,
    is_required: true,
  } satisfies ITodoAppConfiguration.ICreate;

  const createdConfiguration =
    await api.functional.todoApp.user.configurations.create(connection, {
      body: configurationData,
    });
  typia.assert(createdConfiguration);

  // Step 3: Retrieve the configuration using its unique configKey
  const retrievedConfiguration =
    await api.functional.todoApp.user.configurations.at(connection, {
      configKey: createdConfiguration.config_key,
    });
  typia.assert(retrievedConfiguration);

  // Step 4: Validate that retrieved configuration matches created configuration
  TestValidator.equals(
    "config_key matches",
    retrievedConfiguration.config_key,
    createdConfiguration.config_key,
  );
  TestValidator.equals(
    "name matches",
    retrievedConfiguration.name,
    createdConfiguration.name,
  );
  TestValidator.equals(
    "description matches",
    retrievedConfiguration.description,
    createdConfiguration.description,
  );
  TestValidator.equals(
    "data_type matches",
    retrievedConfiguration.data_type,
    createdConfiguration.data_type,
  );
  TestValidator.equals(
    "default_value matches",
    retrievedConfiguration.default_value,
    createdConfiguration.default_value,
  );
  TestValidator.equals(
    "validation_rules matches",
    retrievedConfiguration.validation_rules,
    createdConfiguration.validation_rules,
  );
  TestValidator.equals(
    "category matches",
    retrievedConfiguration.category,
    createdConfiguration.category,
  );
  TestValidator.equals(
    "is_sensitive matches",
    retrievedConfiguration.is_sensitive,
    createdConfiguration.is_sensitive,
  );
  TestValidator.equals(
    "is_required matches",
    retrievedConfiguration.is_required,
    createdConfiguration.is_required,
  );
  TestValidator.equals(
    "version matches",
    retrievedConfiguration.version,
    createdConfiguration.version,
  );

  // Step 5: Validate system-generated fields are properly set
  TestValidator.predicate(
    "ID is properly generated",
    retrievedConfiguration.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is properly set",
    retrievedConfiguration.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is properly set",
    retrievedConfiguration.updated_at.length > 0,
  );
  TestValidator.predicate(
    "version is properly incremented",
    retrievedConfiguration.version >= 1,
  );

  // Step 6: Verify that timestamps follow logical sequence
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    retrievedConfiguration.created_at <= retrievedConfiguration.updated_at,
  );

  // Step 7: Validate that deleted_at is undefined for active configuration
  TestValidator.equals(
    "deleted_at should be undefined for active configuration",
    retrievedConfiguration.deleted_at,
    undefined,
  );
}
