import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that soft-deletion maintains complete audit trail of configuration
 * lifecycle.
 *
 * This test validates that when a platform configuration is soft-deleted, the
 * system preserves the complete historical record with timestamps and all field
 * values intact. Administrators can audit when configurations were created and
 * deleted, supporting compliance tracking and recovery operations.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator using join endpoint
 * 2. Create a new platform configuration with test data
 * 3. Soft-delete the configuration by its unique key
 * 4. Verify the deleted configuration record maintains audit trail
 * 5. Confirm created_at is preserved from original creation
 * 6. Confirm deleted_at is set to soft-delete timestamp
 * 7. Verify all configuration fields remain intact for recovery
 */
export async function test_api_platform_configuration_deletion_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a platform configuration
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = RandomGenerator.alphaNumeric(16);
  const configDescription = RandomGenerator.paragraph({ sentences: 3 });

  const createdConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configKey,
          value: configValue,
          description: configDescription,
          data_type: "string",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);

  // Verify created configuration has no deleted_at timestamp
  TestValidator.predicate(
    "created configuration should not have deleted_at",
    createdConfig.deleted_at === undefined || createdConfig.deleted_at === null,
  );

  // Store the created_at timestamp for comparison after deletion
  const originalCreatedAt = createdConfig.created_at;

  // Step 3: Soft-delete the configuration
  const deletedConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.erase(
      connection,
      {
        configurationKey: configKey,
      },
    );
  typia.assert(deletedConfig);

  // Step 4: Verify deleted configuration maintains audit trail
  TestValidator.predicate(
    "deleted configuration should have deleted_at timestamp",
    deletedConfig.deleted_at !== undefined && deletedConfig.deleted_at !== null,
  );

  // Step 5: Verify created_at is preserved from original creation
  TestValidator.equals(
    "created_at should be preserved after deletion",
    deletedConfig.created_at,
    originalCreatedAt,
  );

  // Step 6: Verify all configuration fields remain intact
  TestValidator.equals(
    "configuration key should be preserved",
    deletedConfig.key,
    configKey,
  );
  TestValidator.equals(
    "configuration value should be preserved",
    deletedConfig.value,
    configValue,
  );
  TestValidator.equals(
    "configuration description should be preserved",
    deletedConfig.description,
    configDescription,
  );
  TestValidator.equals(
    "configuration data_type should be preserved",
    deletedConfig.data_type,
    "string",
  );

  // Step 7: Verify configuration ID is maintained
  TestValidator.equals(
    "configuration ID should be preserved",
    deletedConfig.id,
    createdConfig.id,
  );

  // Step 8: Verify audit trail completeness
  TestValidator.predicate(
    "deleted_at should be after or equal to created_at",
    new Date(deletedConfig.deleted_at!) >= new Date(deletedConfig.created_at),
  );

  TestValidator.predicate(
    "updated_at should reflect recent modification",
    new Date(deletedConfig.updated_at) >= new Date(deletedConfig.created_at),
  );
}
