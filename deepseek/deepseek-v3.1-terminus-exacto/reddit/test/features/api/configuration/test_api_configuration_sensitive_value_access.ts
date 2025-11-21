import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test access to sensitive configuration values with proper authorization.
 *
 * This test validates that administrators can retrieve sensitive configuration
 * values when properly authenticated, while the system maintains appropriate
 * security boundaries. It tests the retrieval of configurations with different
 * sensitivity levels and ensures proper value protection mechanisms are in
 * place.
 */
export async function test_api_configuration_sensitive_value_access(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account with appropriate privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Validate authentication token was set
  TestValidator.predicate(
    "authentication token should be set after admin join",
    admin.token.access.length > 0,
  );

  // Step 2: Create sensitive test configuration
  const sensitiveConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `sensitive_config_${RandomGenerator.alphaNumeric(8)}`,
          value: "encrypted_api_key_value",
          data_type: "string",
          description:
            "Sensitive API key configuration for external service integration",
          category: "security",
          is_sensitive: true,
          is_editable: false,
          default_value: "default_encrypted_value",
          validation_regex: "^[A-Za-z0-9]+$",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(sensitiveConfig);

  // Step 3: Create non-sensitive test configuration for comparison
  const nonSensitiveConfig =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: `nonsensitive_config_${RandomGenerator.alphaNumeric(8)}`,
          value: "public_setting_value",
          data_type: "string",
          description:
            "Public configuration setting for general platform behavior",
          category: "general",
          is_sensitive: false,
          is_editable: true,
          default_value: "default_public_value",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(nonSensitiveConfig);

  // Validate configuration keys are unique
  TestValidator.notEquals(
    "sensitive and non-sensitive configurations should have different keys",
    sensitiveConfig.key,
    nonSensitiveConfig.key,
  );

  // Step 4: Retrieve sensitive configuration with proper authentication
  const retrievedSensitiveConfig =
    await api.functional.communityPlatform.admin.configurations.at(connection, {
      configurationKey: sensitiveConfig.key,
    });
  typia.assert(retrievedSensitiveConfig);

  // Validate that sensitive configuration is correctly retrieved
  TestValidator.equals(
    "sensitive configuration key should match created key",
    retrievedSensitiveConfig.key,
    sensitiveConfig.key,
  );
  TestValidator.equals(
    "sensitive configuration value should be accessible to authorized admin",
    retrievedSensitiveConfig.value,
    sensitiveConfig.value,
  );
  TestValidator.predicate(
    "sensitive configuration should have sensitivity flag set to true",
    retrievedSensitiveConfig.is_sensitive === true,
  );

  // Step 5: Retrieve non-sensitive configuration for comparison
  const retrievedNonSensitiveConfig =
    await api.functional.communityPlatform.admin.configurations.at(connection, {
      configurationKey: nonSensitiveConfig.key,
    });
  typia.assert(retrievedNonSensitiveConfig);

  // Validate that non-sensitive configuration is correctly retrieved
  TestValidator.equals(
    "non-sensitive configuration key should match created key",
    retrievedNonSensitiveConfig.key,
    nonSensitiveConfig.key,
  );
  TestValidator.equals(
    "non-sensitive configuration value should be accessible",
    retrievedNonSensitiveConfig.value,
    nonSensitiveConfig.value,
  );
  TestValidator.predicate(
    "non-sensitive configuration should have sensitivity flag set to false",
    retrievedNonSensitiveConfig.is_sensitive === false,
  );

  // Step 6: Validate security boundary differences
  TestValidator.predicate(
    "sensitive configuration should have restricted editability",
    retrievedSensitiveConfig.is_editable === false,
  );
  TestValidator.predicate(
    "non-sensitive configuration should allow editing",
    retrievedNonSensitiveConfig.is_editable === true,
  );

  // Step 7: Validate configuration metadata integrity
  TestValidator.equals(
    "sensitive configuration description should match",
    retrievedSensitiveConfig.description,
    sensitiveConfig.description,
  );
  TestValidator.equals(
    "sensitive configuration category should match",
    retrievedSensitiveConfig.category,
    sensitiveConfig.category,
  );
  TestValidator.equals(
    "sensitive configuration data type should match",
    retrievedSensitiveConfig.data_type,
    sensitiveConfig.data_type,
  );

  TestValidator.equals(
    "non-sensitive configuration description should match",
    retrievedNonSensitiveConfig.description,
    nonSensitiveConfig.description,
  );
  TestValidator.equals(
    "non-sensitive configuration category should match",
    retrievedNonSensitiveConfig.category,
    nonSensitiveConfig.category,
  );
  TestValidator.equals(
    "non-sensitive configuration data type should match",
    retrievedNonSensitiveConfig.data_type,
    nonSensitiveConfig.data_type,
  );

  // Step 8: Validate that configurations are properly created with timestamps
  TestValidator.predicate(
    "sensitive configuration should have creation timestamp",
    retrievedSensitiveConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "non-sensitive configuration should have creation timestamp",
    retrievedNonSensitiveConfig.created_at.length > 0,
  );

  // Final validation: Both configurations should be accessible to authorized admin
  TestValidator.predicate(
    "authorized admin should be able to access both sensitive and non-sensitive configurations",
    retrievedSensitiveConfig.id !== retrievedNonSensitiveConfig.id &&
      retrievedSensitiveConfig.key !== retrievedNonSensitiveConfig.key,
  );
}
