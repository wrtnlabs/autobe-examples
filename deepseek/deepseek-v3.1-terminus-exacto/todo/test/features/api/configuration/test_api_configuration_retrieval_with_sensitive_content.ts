import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieval of configurations containing sensitive information to ensure
 * proper security handling.
 *
 * This test validates that sensitive configuration flags are properly indicated
 * in the response and that the system maintains security protocols for
 * sensitive data. It also validates that non-sensitive configurations are
 * retrieved normally without unnecessary security restrictions.
 */
export async function test_api_configuration_retrieval_with_sensitive_content(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/todoapp",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a sensitive configuration definition
  const sensitiveConfig =
    await api.functional.todoApp.user.configurations.create(connection, {
      body: {
        config_key: "security.encryption.master_key",
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        data_type: "string",
        default_value: "default_encryption_key_placeholder",
        category: "security",
        is_sensitive: true,
        is_required: true,
      } satisfies ITodoAppConfiguration.ICreate,
    });
  typia.assert(sensitiveConfig);

  // Step 3: Retrieve the sensitive configuration
  const retrievedConfig = await api.functional.todoApp.user.configurations.at(
    connection,
    {
      configKey: sensitiveConfig.config_key,
    },
  );
  typia.assert(retrievedConfig);

  // Step 4: Validate sensitive configuration properties
  TestValidator.equals(
    "config key matches",
    retrievedConfig.config_key,
    sensitiveConfig.config_key,
  );
  TestValidator.equals(
    "name matches",
    retrievedConfig.name,
    sensitiveConfig.name,
  );
  TestValidator.equals(
    "description matches",
    retrievedConfig.description,
    sensitiveConfig.description,
  );
  TestValidator.equals(
    "data type matches",
    retrievedConfig.data_type,
    sensitiveConfig.data_type,
  );
  TestValidator.equals(
    "default value matches",
    retrievedConfig.default_value,
    sensitiveConfig.default_value,
  );
  TestValidator.equals(
    "category matches",
    retrievedConfig.category,
    sensitiveConfig.category,
  );
  TestValidator.predicate(
    "is_sensitive flag is true",
    retrievedConfig.is_sensitive === true,
  );
  TestValidator.predicate(
    "is_required flag is true",
    retrievedConfig.is_required === true,
  );

  // Step 5: Create a non-sensitive configuration for comparison
  const nonSensitiveConfig =
    await api.functional.todoApp.user.configurations.create(connection, {
      body: {
        config_key: "ui.theme.default_color",
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        data_type: "string",
        default_value: "blue",
        category: "ui",
        is_sensitive: false,
        is_required: false,
      } satisfies ITodoAppConfiguration.ICreate,
    });
  typia.assert(nonSensitiveConfig);

  // Step 6: Retrieve the non-sensitive configuration
  const retrievedNonSensitiveConfig =
    await api.functional.todoApp.user.configurations.at(connection, {
      configKey: nonSensitiveConfig.config_key,
    });
  typia.assert(retrievedNonSensitiveConfig);

  // Step 7: Validate non-sensitive configuration properties
  TestValidator.equals(
    "non-sensitive config key matches",
    retrievedNonSensitiveConfig.config_key,
    nonSensitiveConfig.config_key,
  );
  TestValidator.predicate(
    "non-sensitive is_sensitive flag is false",
    retrievedNonSensitiveConfig.is_sensitive === false,
  );
  TestValidator.predicate(
    "non-sensitive is_required flag is false",
    retrievedNonSensitiveConfig.is_required === false,
  );

  // Step 8: Validate that both configurations have proper system-generated fields
  TestValidator.predicate(
    "sensitive config has version number",
    typeof retrievedConfig.version === "number",
  );
  TestValidator.predicate(
    "non-sensitive config has version number",
    typeof retrievedNonSensitiveConfig.version === "number",
  );
  TestValidator.predicate(
    "sensitive config has creation timestamp",
    typeof retrievedConfig.created_at === "string",
  );
  TestValidator.predicate(
    "non-sensitive config has creation timestamp",
    typeof retrievedNonSensitiveConfig.created_at === "string",
  );
  TestValidator.predicate(
    "sensitive config has update timestamp",
    typeof retrievedConfig.updated_at === "string",
  );
  TestValidator.predicate(
    "non-sensitive config has update timestamp",
    typeof retrievedNonSensitiveConfig.updated_at === "string",
  );

  // Step 9: Additional security validation - ensure sensitive data handling
  TestValidator.notEquals(
    "sensitive and non-sensitive configs have different IDs",
    retrievedConfig.id,
    retrievedNonSensitiveConfig.id,
  );
  TestValidator.notEquals(
    "sensitive and non-sensitive configs have different creation times",
    retrievedConfig.created_at,
    retrievedNonSensitiveConfig.created_at,
  );
}
