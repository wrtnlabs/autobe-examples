import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";

/**
 * Test the system's handling of update attempts on non-existent configuration
 * keys.
 *
 * This test validates that the platform properly rejects update operations for
 * configuration keys that do not exist in the system, returning appropriate
 * error responses. The test ensures that configuration management maintains
 * data integrity by preventing updates to non-existent entries and provides
 * clear feedback to administrators when attempting to modify configurations
 * that have not been created.
 *
 * Implementation Steps:
 *
 * 1. Create an administrator account to establish authentication context
 * 2. Generate a random configuration key that does not exist in the system
 * 3. Attempt to update the non-existent configuration key with valid update data
 * 4. Validate that the update operation fails with an appropriate error
 */
export async function test_api_configuration_update_nonexistent_key(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Generate a random configuration key that does not exist
  const nonExistentKey = RandomGenerator.alphaNumeric(20);

  // Step 3: Attempt to update the non-existent configuration key
  await TestValidator.error(
    "update operation should fail for non-existent configuration key",
    async () => {
      await api.functional.communityPlatform.admin.configurations.update(
        connection,
        {
          configurationKey: nonExistentKey,
          body: {
            value: "updated_value",
            description: "Attempting to update non-existent configuration",
            category: "test",
            is_sensitive: false,
            is_editable: true,
          } satisfies ICommunityPlatformConfiguration.IUpdate,
        },
      );
    },
  );
}
