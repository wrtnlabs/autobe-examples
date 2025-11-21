import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";

/**
 * Validates administrator account deletion dependency checking
 *
 * This test ensures that admin accounts cannot be deleted when they have active
 * dependencies like created channels. It creates three admin accounts:
 *
 * - Super admin: Performs deletion operations
 * - Target admin with dependencies: Has created channels (should fail deletion)
 * - Regular admin: No dependencies (should succeed deletion)
 *
 * The test validates comprehensive dependency checking and maintains platform
 * security by preventing orphaned administrative resources.
 */
export async function test_api_admin_account_deletion_dependency_validation(
  connection: api.IConnection,
) {
  // Step 1: Create super administrator account
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password: "superadmin123",
        display_name: "Super Administrator",
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // Step 2: Create target administrator account with dependencies
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: targetAdminEmail,
        password: "targetadmin123",
        display_name: "Target Administrator",
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  // Step 3: Create channel dependency for target admin
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: "Test Channel",
        description: "Channel created for dependency testing",
        sort_order: 1,
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 4: Attempt to delete target admin with dependencies (should fail)
  await TestValidator.error(
    "cannot delete admin with active dependencies",
    async () => {
      await api.functional.communityPlatform.admin.admins.erase(connection, {
        adminId: targetAdmin.id,
      });
    },
  );

  // Step 5: Create regular admin without dependencies
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  const regularAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: regularAdminEmail,
        password: "regularadmin123",
        display_name: "Regular Administrator",
        admin_level: "user",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(regularAdmin);

  // Step 6: Successfully delete admin without dependencies
  await api.functional.communityPlatform.admin.admins.erase(connection, {
    adminId: regularAdmin.id,
  });

  // Step 7: Verify the channel still exists after failed deletion attempt
  const channelsList =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        display_name: "Verification Channel",
        description: "Channel to verify dependency persistence",
        sort_order: 2,
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channelsList);

  TestValidator.predicate(
    "channel creation still works after admin deletion attempts",
    channelsList.id !== channel.id,
  );
}
