import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test creation of sensitive configurations that require additional security
 * measures. This scenario validates the proper handling of configurations
 * marked as sensitive, ensuring they receive appropriate security treatment.
 * The test should verify that sensitive configurations are properly flagged and
 * that the system handles them with enhanced security protocols. It should also
 * validate that non-sensitive configurations are handled normally without
 * unnecessary security overhead.
 */
export async function test_api_configuration_creation_with_sensitive_flag(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create sensitive configuration
  const sensitiveConfigData = {
    config_key: `security.encryption.algorithm`,
    name: "Encryption Algorithm",
    description: "Specifies the encryption algorithm used for sensitive data",
    data_type: "string",
    default_value: "AES-256",
    validation_rules: JSON.stringify({
      enum: ["AES-128", "AES-256", "RSA-2048", "RSA-4096"],
    }),
    category: "security",
    is_sensitive: true,
    is_required: true,
  } satisfies ITodoAppConfiguration.ICreate;

  const sensitiveConfig =
    await api.functional.todoApp.user.configurations.create(connection, {
      body: sensitiveConfigData,
    });
  typia.assert(sensitiveConfig);

  // Validate sensitive configuration properties
  TestValidator.equals(
    "sensitive config key matches",
    sensitiveConfig.config_key,
    sensitiveConfigData.config_key,
  );
  TestValidator.equals(
    "sensitive config name matches",
    sensitiveConfig.name,
    sensitiveConfigData.name,
  );
  TestValidator.equals(
    "sensitive config description matches",
    sensitiveConfig.description,
    sensitiveConfigData.description,
  );
  TestValidator.equals(
    "sensitive config data type matches",
    sensitiveConfig.data_type,
    sensitiveConfigData.data_type,
  );
  TestValidator.equals(
    "sensitive config default value matches",
    sensitiveConfig.default_value,
    sensitiveConfigData.default_value,
  );
  TestValidator.equals(
    "sensitive config category matches",
    sensitiveConfig.category,
    sensitiveConfigData.category,
  );
  TestValidator.predicate(
    "sensitive config is marked as sensitive",
    sensitiveConfig.is_sensitive === true,
  );
  TestValidator.predicate(
    "sensitive config is marked as required",
    sensitiveConfig.is_required === true,
  );

  // Step 3: Create non-sensitive configuration
  const nonSensitiveConfigData = {
    config_key: `ui.theme.primary_color`,
    name: "Primary Theme Color",
    description: "Primary color used in the application theme",
    data_type: "string",
    default_value: "#007bff",
    validation_rules: JSON.stringify({
      pattern: "^#[0-9A-Fa-f]{6}$",
    }),
    category: "ui",
    is_sensitive: false,
    is_required: false,
  } satisfies ITodoAppConfiguration.ICreate;

  const nonSensitiveConfig =
    await api.functional.todoApp.user.configurations.create(connection, {
      body: nonSensitiveConfigData,
    });
  typia.assert(nonSensitiveConfig);

  // Validate non-sensitive configuration properties
  TestValidator.equals(
    "non-sensitive config key matches",
    nonSensitiveConfig.config_key,
    nonSensitiveConfigData.config_key,
  );
  TestValidator.equals(
    "non-sensitive config name matches",
    nonSensitiveConfig.name,
    nonSensitiveConfigData.name,
  );
  TestValidator.equals(
    "non-sensitive config description matches",
    nonSensitiveConfig.description,
    nonSensitiveConfigData.description,
  );
  TestValidator.equals(
    "non-sensitive config data type matches",
    nonSensitiveConfig.data_type,
    nonSensitiveConfigData.data_type,
  );
  TestValidator.equals(
    "non-sensitive config default value matches",
    nonSensitiveConfig.default_value,
    nonSensitiveConfigData.default_value,
  );
  TestValidator.equals(
    "non-sensitive config category matches",
    nonSensitiveConfig.category,
    nonSensitiveConfigData.category,
  );
  TestValidator.predicate(
    "non-sensitive config is marked as not sensitive",
    nonSensitiveConfig.is_sensitive === false,
  );
  TestValidator.predicate(
    "non-sensitive config is marked as not required",
    nonSensitiveConfig.is_required === false,
  );

  // Step 4: Verify IDs are unique
  TestValidator.notEquals(
    "configuration IDs should be unique",
    sensitiveConfig.id,
    nonSensitiveConfig.id,
  );

  // Step 5: Verify timestamps are properly set
  TestValidator.predicate(
    "sensitive config has creation timestamp",
    sensitiveConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "sensitive config has update timestamp",
    sensitiveConfig.updated_at !== undefined,
  );
  TestValidator.predicate(
    "non-sensitive config has creation timestamp",
    nonSensitiveConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "non-sensitive config has update timestamp",
    nonSensitiveConfig.updated_at !== undefined,
  );

  // Step 6: Verify version numbers
  TestValidator.predicate(
    "sensitive config has version number",
    sensitiveConfig.version === 1,
  );
  TestValidator.predicate(
    "non-sensitive config has version number",
    nonSensitiveConfig.version === 1,
  );
}
