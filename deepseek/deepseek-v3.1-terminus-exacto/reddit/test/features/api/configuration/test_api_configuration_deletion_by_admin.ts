import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test the complete configuration deletion workflow where an administrator
 * creates a configuration setting and then permanently deletes it. The scenario
 * validates that configuration deletion requires proper administrator
 * authentication, ensures the configuration exists before deletion, and
 * verifies that the deletion operation is irreversible.
 */
export async function test_api_configuration_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a configuration setting to be deleted
  const configurationKey = `test.config.${RandomGenerator.alphaNumeric(8)}`;
  const configuration: ICommunityPlatformConfiguration =
    await api.functional.communityPlatform.admin.configurations.create(
      connection,
      {
        body: {
          key: configurationKey,
          value: "test configuration value",
          data_type: "string",
          description: "Test configuration for deletion workflow",
          category: "test",
          is_sensitive: false,
          is_editable: true,
          default_value: "default value",
        } satisfies ICommunityPlatformConfiguration.ICreate,
      },
    );
  typia.assert(configuration);
  TestValidator.equals(
    "created configuration key matches",
    configuration.key,
    configurationKey,
  );

  // Step 3: Delete the configuration
  await api.functional.communityPlatform.admin.configurations.erase(
    connection,
    {
      configurationKey: configuration.key,
    },
  );

  // Step 4: Verify deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "deleting non-existent configuration should fail",
    async () => {
      await api.functional.communityPlatform.admin.configurations.erase(
        connection,
        {
          configurationKey: configuration.key,
        },
      );
    },
  );

  // Step 5: Test deletion of non-existent configuration
  const nonExistentKey = `non.existent.${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.error(
    "deleting non-existent configuration should fail",
    async () => {
      await api.functional.communityPlatform.admin.configurations.erase(
        connection,
        {
          configurationKey: nonExistentKey,
        },
      );
    },
  );
}
