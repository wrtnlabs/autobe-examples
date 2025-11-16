import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_platform_configuration_deletion_inactive_configuration(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  // Create administrator account with necessary credentials for platform management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  TestValidator.equals(
    "administrator authenticated",
    administrator.email,
    adminEmail,
  );

  // Step 2: Create an inactive configuration
  // Configuration for a feature that is not actively used (e.g., legacy feature flag)
  const inactiveConfigKey = `inactive_feature_${RandomGenerator.alphaNumeric(8)}`;
  const createdConfig =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: inactiveConfigKey,
          value: "false",
          description: "Inactive feature flag for legacy functionality",
          data_type: "boolean",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);
  TestValidator.equals(
    "configuration created successfully",
    createdConfig.key,
    inactiveConfigKey,
  );
  TestValidator.equals(
    "configuration value is false",
    createdConfig.value,
    "false",
  );

  // Step 3: Delete the inactive configuration
  // Verify that deletion of unused configuration completes without errors
  const deletedConfig =
    await api.functional.communityPlatform.administrator.configurations.erase(
      connection,
      {
        configurationKey: inactiveConfigKey,
      },
    );
  typia.assert(deletedConfig);
  TestValidator.equals(
    "deleted configuration key matches",
    deletedConfig.key,
    inactiveConfigKey,
  );
  TestValidator.predicate(
    "configuration marked as deleted",
    deletedConfig.deleted_at !== null && deletedConfig.deleted_at !== undefined,
  );

  // Step 4: Verify deletion completed without side effects
  // Ensure the configuration is soft-deleted but still trackable for audit purposes
  TestValidator.equals(
    "original configuration data preserved",
    deletedConfig.key,
    createdConfig.key,
  );
  TestValidator.equals(
    "value unchanged after deletion",
    deletedConfig.value,
    createdConfig.value,
  );
  TestValidator.equals(
    "creation timestamp preserved",
    deletedConfig.created_at,
    createdConfig.created_at,
  );
}
