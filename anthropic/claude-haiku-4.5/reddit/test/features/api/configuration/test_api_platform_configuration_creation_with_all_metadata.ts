import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test configuration creation with complete metadata.
 *
 * This test validates that platform administrators can create configuration
 * settings with full metadata documentation. The test covers:
 *
 * 1. Administrator authentication and account creation
 * 2. Configuration creation with boolean data type and comprehensive description
 * 3. Configuration creation with integer data type and detailed documentation
 * 4. Configuration creation with string data type and full metadata
 * 5. Verification that all metadata is correctly stored and preserved
 *
 * Each configuration includes a unique key, a value conforming to its data
 * type, a data_type specification for validation, and a complete description
 * text for administrator reference. This ensures configurations are fully
 * documented for maintainability and future understanding.
 */
export async function test_api_platform_configuration_creation_with_all_metadata(
  connection: api.IConnection,
) {
  // Step 1: Administrator joins platform
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const adminUsername = RandomGenerator.alphabets(10);
  const adminName = RandomGenerator.name();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://example.com/admin/register",
        referrer: "https://example.com/admin",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin authenticated", admin.email, adminEmail);

  // Step 2: Create configuration with boolean data type
  const booleanConfigKey = "voting_enabled";
  const booleanConfigValue = "true";
  const booleanConfigDescription =
    "Controls whether voting functionality is enabled across the entire platform. When set to true, all users can vote on posts and comments. When false, voting interface is hidden and voting operations are rejected. Administrators should disable this during maintenance or testing periods.";

  const booleanConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: booleanConfigKey,
          value: booleanConfigValue,
          description: booleanConfigDescription,
          data_type: "boolean",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(booleanConfig);
  TestValidator.equals(
    "boolean config key matches",
    booleanConfig.key,
    booleanConfigKey,
  );
  TestValidator.equals(
    "boolean config value matches",
    booleanConfig.value,
    booleanConfigValue,
  );
  TestValidator.equals(
    "boolean config description preserved",
    booleanConfig.description,
    booleanConfigDescription,
  );
  TestValidator.equals(
    "boolean config data_type recorded",
    booleanConfig.data_type,
    "boolean",
  );

  // Step 3: Create configuration with integer data type
  const integerConfigKey = "max_posts_per_hour";
  const integerConfigValue = "100";
  const integerConfigDescription =
    "Limits the maximum number of posts a single user can create within a one-hour time window. This rate limit prevents spam and abuse. Set to 100 for standard users, 500 for premium users. Adjust based on platform load and user feedback. Value must be a positive integer representing the post count threshold.";

  const integerConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: integerConfigKey,
          value: integerConfigValue,
          description: integerConfigDescription,
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(integerConfig);
  TestValidator.equals(
    "integer config key matches",
    integerConfig.key,
    integerConfigKey,
  );
  TestValidator.equals(
    "integer config value matches",
    integerConfig.value,
    integerConfigValue,
  );
  TestValidator.equals(
    "integer config description preserved",
    integerConfig.description,
    integerConfigDescription,
  );
  TestValidator.equals(
    "integer config data_type recorded",
    integerConfig.data_type,
    "integer",
  );

  // Step 4: Create configuration with string data type
  const stringConfigKey = "platform_mode";
  const stringConfigValue = "production";
  const stringConfigDescription =
    "Specifies the operational mode of the platform. Valid values are: production (live environment with all features), staging (pre-production testing environment), development (local development with debugging enabled), maintenance (restricted access for system updates). Changes to this setting affect API responses, logging behavior, and feature availability. Production mode disables all debug endpoints and verbose logging for security.";

  const stringConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: stringConfigKey,
          value: stringConfigValue,
          description: stringConfigDescription,
          data_type: "string",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(stringConfig);
  TestValidator.equals(
    "string config key matches",
    stringConfig.key,
    stringConfigKey,
  );
  TestValidator.equals(
    "string config value matches",
    stringConfig.value,
    stringConfigValue,
  );
  TestValidator.equals(
    "string config description preserved",
    stringConfig.description,
    stringConfigDescription,
  );
  TestValidator.equals(
    "string config data_type recorded",
    stringConfig.data_type,
    "string",
  );

  // Step 5: Verify all configurations have proper timestamps
  TestValidator.predicate(
    "boolean config has created_at",
    booleanConfig.created_at !== null && booleanConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "boolean config has updated_at",
    booleanConfig.updated_at !== null && booleanConfig.updated_at !== undefined,
  );
  TestValidator.predicate(
    "integer config has created_at",
    integerConfig.created_at !== null && integerConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "integer config has updated_at",
    integerConfig.updated_at !== null && integerConfig.updated_at !== undefined,
  );
  TestValidator.predicate(
    "string config has created_at",
    stringConfig.created_at !== null && stringConfig.created_at !== undefined,
  );
  TestValidator.predicate(
    "string config has updated_at",
    stringConfig.updated_at !== null && stringConfig.updated_at !== undefined,
  );

  // Step 6: Verify all configurations have UUID identifiers
  TestValidator.predicate(
    "boolean config has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      booleanConfig.id,
    ),
  );
  TestValidator.predicate(
    "integer config has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      integerConfig.id,
    ),
  );
  TestValidator.predicate(
    "string config has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      stringConfig.id,
    ),
  );
}
