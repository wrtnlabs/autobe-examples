import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test channel deletion attempt for a non-existent channel to validate proper
 * error handling and response behavior.
 *
 * This test ensures that the system returns appropriate error messages when
 * attempting to delete channels that do not exist. The test validates that
 * deletion operations gracefully handle invalid channel references and maintain
 * platform stability by preventing destructive operations on non-existent
 * resources.
 *
 * Test Flow:
 *
 * 1. Authenticate as administrator with proper credentials
 * 2. Generate a realistic but non-existent channel name
 * 3. Attempt to delete the non-existent channel
 * 4. Validate that the operation fails with appropriate error handling
 */
export async function test_api_channel_deletion_non_existent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!" satisfies string & tags.Format<"password">,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Generate a realistic non-existent channel name
  const nonExistentChannelName = RandomGenerator.name(2)
    .replace(/\s+/g, "-")
    .toLowerCase();

  // Step 3: Attempt to delete non-existent channel and validate error
  await TestValidator.error(
    "deleting non-existent channel should fail with proper error handling",
    async () => {
      await api.functional.communityPlatform.admin.channels.erase(connection, {
        channelName: nonExistentChannelName,
      });
    },
  );
}
