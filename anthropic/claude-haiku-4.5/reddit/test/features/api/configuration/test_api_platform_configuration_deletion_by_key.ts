import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test deletion of configuration using the specific configuration key as the
 * path parameter.
 *
 * This test validates the soft-deletion functionality of platform
 * configurations:
 *
 * 1. Authenticates as a platform administrator
 * 2. Creates a new configuration with a specific, known key
 * 3. Deletes the configuration using its key in the DELETE request path
 * 4. Verifies the deleted configuration details are returned
 * 5. Confirms the configuration has a deleted_at timestamp (soft-delete)
 * 6. Ensures the configuration is properly marked as deleted without destroying
 *    data
 */
export async function test_api_platform_configuration_deletion_by_key(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "administrator authenticated",
    admin.account_status,
    "active",
  );

  // Step 2: Create a configuration with a specific known key
  const configurationKey = "max_posts_per_hour";
  const configurationValue = "24";
  const configurationDescription = "Maximum number of posts allowed per hour";

  const createdConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.create(
      connection,
      {
        body: {
          key: configurationKey,
          value: configurationValue,
          description: configurationDescription,
          data_type: "integer",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);
  TestValidator.equals(
    "configuration key matches",
    createdConfig.key,
    configurationKey,
  );
  TestValidator.equals(
    "configuration value matches",
    createdConfig.value,
    configurationValue,
  );
  TestValidator.predicate(
    "configuration is active before deletion",
    createdConfig.deleted_at === null || createdConfig.deleted_at === undefined,
  );

  // Step 3: Delete the configuration using its key
  const deletedConfig: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.administrator.configurations.erase(
      connection,
      {
        configurationKey: configurationKey,
      },
    );
  typia.assert(deletedConfig);

  // Step 4: Verify the deleted configuration details are returned
  TestValidator.equals(
    "deleted configuration key matches",
    deletedConfig.key,
    configurationKey,
  );
  TestValidator.equals(
    "deleted configuration value preserved",
    deletedConfig.value,
    configurationValue,
  );
  TestValidator.equals(
    "deleted configuration ID matches",
    deletedConfig.id,
    createdConfig.id,
  );

  // Step 5: Confirm the configuration has a deleted_at timestamp (soft-delete)
  TestValidator.predicate(
    "configuration has deleted_at timestamp",
    deletedConfig.deleted_at !== null && deletedConfig.deleted_at !== undefined,
  );

  // Step 6: Verify that the deleted_at timestamp is in ISO 8601 format
  if (deletedConfig.deleted_at) {
    const deletedAtDate = new Date(deletedConfig.deleted_at);
    TestValidator.predicate(
      "deleted_at is valid ISO 8601 date",
      !isNaN(deletedAtDate.getTime()),
    );
  }

  // Step 7: Verify the configuration is properly marked as deleted without data destruction
  TestValidator.equals(
    "original metadata preserved",
    deletedConfig.description,
    configurationDescription,
  );
  TestValidator.equals(
    "creation timestamp preserved",
    deletedConfig.created_at,
    createdConfig.created_at,
  );
}
