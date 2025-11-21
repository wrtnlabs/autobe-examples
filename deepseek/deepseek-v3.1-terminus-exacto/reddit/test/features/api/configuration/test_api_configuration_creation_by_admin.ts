import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test the complete workflow for creating new platform configuration settings
 * by administrators.
 *
 * This test validates that administrators can successfully create configuration
 * entries with proper validation of unique key constraints, data type
 * specifications, and value formatting. The scenario tests various
 * configuration types including strings, numbers, booleans, and JSON objects,
 * with comprehensive validation of business rules and metadata population.
 */
export async function test_api_configuration_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create string configuration with regex validation
  const stringConfigKey = `config.string.${RandomGenerator.alphaNumeric(8)}`;
  const stringConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: stringConfigKey,
          value: "example-value",
          data_type: "string",
          description: "Example string configuration for testing",
          category: "testing",
          is_sensitive: false,
          is_editable: true,
          default_value: "default-value",
          validation_regex: "^[a-zA-Z0-9_-]+$",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(stringConfig);
  TestValidator.equals(
    "string config key matches input",
    stringConfig.key,
    stringConfigKey,
  );
  TestValidator.equals(
    "string config value matches",
    stringConfig.value,
    "example-value",
  );
  TestValidator.equals(
    "string config data type is string",
    stringConfig.data_type,
    "string",
  );
  TestValidator.equals(
    "string config has validation regex",
    stringConfig.validation_regex,
    "^[a-zA-Z0-9_-]+$",
  );

  // Step 3: Create numeric configuration with min/max constraints
  const numericConfigKey = `config.numeric.${RandomGenerator.alphaNumeric(8)}`;
  const numericConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: numericConfigKey,
          value: "50",
          data_type: "number",
          description: "Numeric configuration with range constraints",
          category: "limits",
          is_sensitive: false,
          is_editable: true,
          min_value: "0",
          max_value: "100",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(numericConfig);
  TestValidator.equals(
    "numeric config data type is number",
    numericConfig.data_type,
    "number",
  );
  TestValidator.equals(
    "numeric config min value stored",
    numericConfig.min_value,
    "0",
  );
  TestValidator.equals(
    "numeric config max value stored",
    numericConfig.max_value,
    "100",
  );

  // Step 4: Create boolean configuration
  const booleanConfigKey = `config.boolean.${RandomGenerator.alphaNumeric(8)}`;
  const booleanConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: booleanConfigKey,
          value: "true",
          data_type: "boolean",
          description: "Boolean flag configuration",
          category: "features",
          is_sensitive: false,
          is_editable: true,
          default_value: "false",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(booleanConfig);
  TestValidator.equals(
    "boolean config data type is boolean",
    booleanConfig.data_type,
    "boolean",
  );
  TestValidator.equals(
    "boolean config value is true",
    booleanConfig.value,
    "true",
  );
  TestValidator.equals(
    "boolean config default value is false",
    booleanConfig.default_value,
    "false",
  );

  // Step 5: Create JSON configuration
  const jsonConfigKey = `config.json.${RandomGenerator.alphaNumeric(8)}`;
  const jsonValue = '{"enabled": true, "threshold": 75}';
  const jsonConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: jsonConfigKey,
          value: jsonValue,
          data_type: "json",
          description: "JSON configuration for complex settings",
          category: "advanced",
          is_sensitive: false,
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(jsonConfig);
  TestValidator.equals(
    "json config data type is json",
    jsonConfig.data_type,
    "json",
  );
  TestValidator.equals(
    "json config value matches",
    jsonConfig.value,
    jsonValue,
  );

  // Step 6: Create sensitive configuration
  const sensitiveConfigKey = `config.sensitive.${RandomGenerator.alphaNumeric(8)}`;
  const sensitiveConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: sensitiveConfigKey,
          value: "sensitive-data-value",
          data_type: "string",
          description: "Sensitive configuration requiring protection",
          category: "security",
          is_sensitive: true,
          is_editable: false,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(sensitiveConfig);
  TestValidator.predicate(
    "sensitive config is marked as sensitive",
    sensitiveConfig.is_sensitive === true,
  );
  TestValidator.predicate(
    "sensitive config is not editable",
    sensitiveConfig.is_editable === false,
  );

  // Step 7: Validate all configurations have proper metadata
  const configs = [
    stringConfig,
    numericConfig,
    booleanConfig,
    jsonConfig,
    sensitiveConfig,
  ];

  for (const config of configs) {
    TestValidator.predicate(
      "config has valid UUID ID",
      config.id.length === 36,
    );
    TestValidator.predicate(
      "config has creation timestamp",
      config.created_at.length > 0,
    );
    TestValidator.predicate(
      "config has update timestamp",
      config.updated_at.length > 0,
    );
    TestValidator.predicate(
      "config has description",
      config.description.length > 0,
    );
    TestValidator.predicate("config has category", config.category.length > 0);
  }

  // Step 8: Test unique key constraint by attempting to create duplicate
  await TestValidator.error("duplicate key should fail", async () => {
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: stringConfig.key, // Using existing key
          value: "duplicate-value",
          data_type: "string",
          description: "Attempting duplicate key",
          category: "testing",
          is_sensitive: false,
          is_editable: true,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  });

  // Step 9: Test boundary conditions for numeric configuration
  const boundaryConfigKey = `config.boundary.${RandomGenerator.alphaNumeric(8)}`;
  const boundaryConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: boundaryConfigKey,
          value: "0", // Minimum boundary value
          data_type: "number",
          description: "Testing minimum boundary",
          category: "boundaries",
          is_sensitive: false,
          is_editable: true,
          min_value: "0",
          max_value: "100",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(boundaryConfig);
  TestValidator.equals(
    "boundary config accepts minimum value",
    boundaryConfig.value,
    "0",
  );
}
