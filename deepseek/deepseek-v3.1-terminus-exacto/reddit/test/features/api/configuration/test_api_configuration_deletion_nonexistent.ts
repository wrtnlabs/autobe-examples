import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test configuration deletion behavior when attempting to delete a
 * configuration that does not exist.
 *
 * This test validates proper error handling and response codes when
 * administrators attempt to delete non-existent configuration keys. The
 * scenario ensures the system provides clear feedback for invalid deletion
 * attempts and maintains data integrity by preventing accidental deletion of
 * non-existent records.
 *
 * Implementation Steps:
 *
 * 1. Authenticate as administrator to establish authorization context
 * 2. Generate a random configuration key that does not exist in the system
 * 3. Attempt to delete the non-existent configuration key
 * 4. Validate that the API call fails appropriately with an error response
 * 5. Ensure no actual configuration data is affected
 */
export async function test_api_configuration_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator to establish authorization context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

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

  // Step 2: Generate a random configuration key that does not exist in the system
  const nonExistentConfigurationKey = RandomGenerator.alphaNumeric(16);

  // Step 3: Attempt to delete the non-existent configuration key
  // This should fail since the configuration does not exist
  await TestValidator.error(
    "deleting non-existent configuration should fail",
    async () => {
      await api.functional.communityPlatform.admin.configurations.erase(
        connection,
        {
          configurationKey: nonExistentConfigurationKey,
        },
      );
    },
  );

  // Step 4: Validate that the operation did not affect any actual configuration data
  // Since we're testing deletion of non-existent keys, no additional validation is needed
  // beyond the error validation above
}
