import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test the soft-deletion model that preserves recovery capability.
 *
 * Create and delete a configuration, then verify that the deleted configuration
 * record remains in the database (soft-deleted, not hard-deleted) and could
 * theoretically be restored by an administrator clearing the deleted_at
 * timestamp. This demonstrates that administrators can recover deleted
 * configurations if deletion was accidental or if business requirements change,
 * without needing to recreate the entire configuration.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator
 * 2. Create a platform configuration with specific key, value, and data_type
 * 3. Verify the configuration was created successfully with all fields
 * 4. Delete the configuration using its key
 * 5. Verify the deleted response contains the deleted_at timestamp (soft-delete)
 * 6. Confirm the configuration is logically deleted but data is preserved
 */
export async function test_api_platform_configuration_deletion_restore_capability(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();

  const authenticated: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/join",
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(authenticated);
  TestValidator.equals(
    "authenticated admin email matches",
    authenticated.email,
    adminEmail,
  );
  TestValidator.predicate(
    "authenticated admin has valid access token",
    authenticated.token.access.length > 0,
  );

  // 2. Create a platform configuration
  const configKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const configValue = "1000";
  const configDescription = RandomGenerator.paragraph({ sentences: 2 });
  const configDataType = "integer";

  const createdConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configKey,
          value: configValue,
          description: configDescription,
          data_type: configDataType,
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);

  // 3. Verify the configuration was created successfully
  TestValidator.equals(
    "created configuration key matches input",
    createdConfig.key,
    configKey,
  );
  TestValidator.equals(
    "created configuration value matches input",
    createdConfig.value,
    configValue,
  );
  TestValidator.equals(
    "created configuration data_type matches input",
    createdConfig.data_type,
    configDataType,
  );
  TestValidator.predicate(
    "created configuration has unique id",
    typia.is<string & tags.Format<"uuid">>(createdConfig.id),
  );
  TestValidator.predicate(
    "created configuration is initially not soft-deleted",
    createdConfig.deleted_at === null || createdConfig.deleted_at === undefined,
  );
  TestValidator.predicate(
    "created configuration has created_at timestamp",
    typeof createdConfig.created_at === "string" &&
      createdConfig.created_at.length > 0,
  );

  // 4. Delete the configuration using its key
  const deletedConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.erase(
      connection,
      {
        configurationKey: configKey,
      },
    );
  typia.assert(deletedConfig);

  // 5. Verify the deleted response contains the deleted_at timestamp (soft-delete)
  TestValidator.equals(
    "deleted configuration key preserved",
    deletedConfig.key,
    configKey,
  );
  TestValidator.equals(
    "deleted configuration value preserved",
    deletedConfig.value,
    configValue,
  );
  TestValidator.equals(
    "deleted configuration data_type preserved",
    deletedConfig.data_type,
    configDataType,
  );
  TestValidator.predicate(
    "deleted configuration has deleted_at timestamp set",
    typeof deletedConfig.deleted_at === "string" &&
      deletedConfig.deleted_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(deletedConfig.deleted_at || ""),
  );

  // 6. Confirm soft-delete characteristics demonstrating recovery capability
  TestValidator.equals(
    "deleted configuration retains original id",
    deletedConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "deleted configuration retains created_at timestamp",
    deletedConfig.created_at,
    createdConfig.created_at,
  );
  TestValidator.predicate(
    "soft-delete preserves all data for recovery",
    deletedConfig.key === createdConfig.key &&
      deletedConfig.value === createdConfig.value &&
      deletedConfig.data_type === createdConfig.data_type &&
      deletedConfig.id === createdConfig.id &&
      (createdConfig.deleted_at === null ||
        createdConfig.deleted_at === undefined) &&
      typeof deletedConfig.deleted_at === "string",
  );
}
