import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test configuration creation with different data type specifications.
 *
 * This test validates that the platform configuration API correctly handles and
 * stores configurations with different data type specifications:
 *
 * - Boolean configurations (e.g., voting_enabled = true/false)
 * - Integer configurations (e.g., max_posts_per_hour = 24)
 * - String configurations (e.g., site_name = "My Platform")
 *
 * The test ensures that:
 *
 * 1. Administrator authentication is established
 * 2. Boolean type configurations are created and stored correctly
 * 3. Integer type configurations are created and stored correctly
 * 4. String type configurations are created and stored correctly
 * 5. Each configuration's data_type field correctly specifies its type
 * 6. Values are stored appropriately for their specified types
 */
export async function test_api_platform_configuration_creation_different_data_types(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123";
  const adminName = RandomGenerator.name();
  const adminUsername = RandomGenerator.alphaNumeric(10);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/join",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create boolean configuration (voting_enabled)
  const booleanConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "voting_enabled",
          value: "true",
          description: "Enable or disable voting functionality on the platform",
          data_type: "boolean",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(booleanConfig);
  TestValidator.equals(
    "boolean config key matches",
    booleanConfig.key,
    "voting_enabled",
  );
  TestValidator.equals(
    "boolean config value matches",
    booleanConfig.value,
    "true",
  );
  TestValidator.equals(
    "boolean config data_type is correct",
    booleanConfig.data_type,
    "boolean",
  );

  // Step 3: Create integer configuration (max_posts_per_hour)
  const integerConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "max_posts_per_hour",
          value: "24",
          description: "Maximum number of posts a user can create per hour",
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(integerConfig);
  TestValidator.equals(
    "integer config key matches",
    integerConfig.key,
    "max_posts_per_hour",
  );
  TestValidator.equals(
    "integer config value matches",
    integerConfig.value,
    "24",
  );
  TestValidator.equals(
    "integer config data_type is correct",
    integerConfig.data_type,
    "integer",
  );

  // Step 4: Create string configuration (site_name)
  const stringConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: "site_name",
          value: "Community Hub",
          description: "Display name for the community platform",
          data_type: "string",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(stringConfig);
  TestValidator.equals(
    "string config key matches",
    stringConfig.key,
    "site_name",
  );
  TestValidator.equals(
    "string config value matches",
    stringConfig.value,
    "Community Hub",
  );
  TestValidator.equals(
    "string config data_type is correct",
    stringConfig.data_type,
    "string",
  );

  // Step 5: Verify all configurations have proper type specifications
  TestValidator.equals(
    "boolean and integer configs have different data types",
    booleanConfig.data_type !== integerConfig.data_type,
    true,
  );
  TestValidator.equals(
    "integer and string configs have different data types",
    integerConfig.data_type !== stringConfig.data_type,
    true,
  );
  TestValidator.equals(
    "boolean and string configs have different data types",
    booleanConfig.data_type !== stringConfig.data_type,
    true,
  );
}
