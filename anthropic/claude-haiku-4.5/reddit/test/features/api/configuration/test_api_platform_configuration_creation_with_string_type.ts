import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates the creation of string-type platform configuration settings.
 *
 * This test verifies that administrators can successfully create platform
 * configurations with string data types. The test covers the complete
 * workflow:
 *
 * 1. Administrator authentication and account creation
 * 2. Creation of string-type configurations with various string values
 * 3. Validation that configurations are stored with correct data_type
 * 4. Verification that string values are properly maintained in the system
 *
 * The test ensures that string configurations can store arbitrary text values,
 * handle enum-like values, and maintain data integrity across create
 * operations.
 */
export async function test_api_platform_configuration_creation_with_string_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword =
    RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(4);
  const adminName = RandomGenerator.name();
  const adminUsername = RandomGenerator.alphaNumeric(10);

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/register",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create first string-type configuration with simple text value
  const simpleConfigKey = `string_config_${RandomGenerator.alphaNumeric(8)}`;
  const simpleConfigValue = RandomGenerator.paragraph({ sentences: 2 });

  const simpleConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: simpleConfigKey,
          value: simpleConfigValue,
          description: "Simple string configuration for testing",
          data_type: "string",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(simpleConfig);
  TestValidator.equals(
    "simple config key matches",
    simpleConfig.key,
    simpleConfigKey,
  );
  TestValidator.equals(
    "simple config value matches",
    simpleConfig.value,
    simpleConfigValue,
  );
  TestValidator.equals(
    "simple config data_type is string",
    simpleConfig.data_type,
    "string",
  );

  // Step 3: Create enum-like string configuration
  const enumConfigKey = `feature_mode_${RandomGenerator.alphaNumeric(8)}`;
  const enumConfigValue = RandomGenerator.pick([
    "enabled",
    "disabled",
    "maintenance",
  ] as const);

  const enumConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: enumConfigKey,
          value: enumConfigValue,
          description: "Enum-like string configuration for feature mode",
          data_type: "string",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(enumConfig);
  TestValidator.equals(
    "enum config key matches",
    enumConfig.key,
    enumConfigKey,
  );
  TestValidator.equals(
    "enum config value matches",
    enumConfig.value,
    enumConfigValue,
  );
  TestValidator.equals(
    "enum config data_type is string",
    enumConfig.data_type,
    "string",
  );

  // Step 4: Create string configuration with special characters
  const specialConfigKey = `special_text_${RandomGenerator.alphaNumeric(8)}`;
  const specialConfigValue =
    "Text with special chars: !@#$%^&*()_+-=[]{}|;:',.<>?/";

  const specialConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: specialConfigKey,
          value: specialConfigValue,
          description: "String configuration with special characters",
          data_type: "string",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(specialConfig);
  TestValidator.equals(
    "special config key matches",
    specialConfig.key,
    specialConfigKey,
  );
  TestValidator.equals(
    "special config value matches",
    specialConfig.value,
    specialConfigValue,
  );
  TestValidator.equals(
    "special config data_type is string",
    specialConfig.data_type,
    "string",
  );

  // Step 5: Create string configuration with empty string value
  const emptyConfigKey = `empty_string_${RandomGenerator.alphaNumeric(8)}`;
  const emptyConfigValue = "";

  const emptyConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: emptyConfigKey,
          value: emptyConfigValue,
          description: "String configuration with empty value",
          data_type: "string",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(emptyConfig);
  TestValidator.equals(
    "empty config key matches",
    emptyConfig.key,
    emptyConfigKey,
  );
  TestValidator.equals(
    "empty config value is empty string",
    emptyConfig.value,
    "",
  );
  TestValidator.equals(
    "empty config data_type is string",
    emptyConfig.data_type,
    "string",
  );

  // Step 6: Create string configuration with long text
  const longConfigKey = `long_text_${RandomGenerator.alphaNumeric(8)}`;
  const longConfigValue = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const longConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: longConfigKey,
          value: longConfigValue,
          description: "String configuration with long text content",
          data_type: "string",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(longConfig);
  TestValidator.equals(
    "long config key matches",
    longConfig.key,
    longConfigKey,
  );
  TestValidator.equals(
    "long config value matches",
    longConfig.value,
    longConfigValue,
  );
  TestValidator.equals(
    "long config data_type is string",
    longConfig.data_type,
    "string",
  );

  // Step 7: Verify all configurations have proper timestamps
  TestValidator.predicate(
    "simple config has created_at timestamp",
    simpleConfig.created_at !== null && simpleConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "simple config has updated_at timestamp",
    simpleConfig.updated_at !== null && simpleConfig.updated_at !== undefined,
  );
  TestValidator.predicate(
    "enum config has created_at timestamp",
    enumConfig.created_at !== null && enumConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "enum config has updated_at timestamp",
    enumConfig.updated_at !== null && enumConfig.updated_at !== undefined,
  );
}
