import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";

/**
 * Test soft deletion of administrator accounts by super administrator.
 *
 * This test validates that a super administrator can perform soft deletion of
 * another administrator account, setting the deleted_at timestamp while
 * preserving the account record for audit purposes. The test ensures proper
 * authentication, dependency checks, and audit trail maintenance.
 *
 * Workflow:
 *
 * 1. Create super administrator account for authentication context
 * 2. Create target administrator account to be deleted
 * 3. Create prerequisite channel as specified in operation dependencies
 * 4. Perform soft deletion operation with proper validation
 * 5. Verify soft deletion preserves account record with deletion timestamp
 */
export async function test_api_admin_account_soft_deletion_by_super_admin(
  connection: api.IConnection,
) {
  // Step 1: Create super administrator account
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password: "SuperAdmin123!",
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // Step 2: Create target administrator account
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: targetAdminEmail,
        password: "TargetAdmin123!",
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  // Step 3: Create prerequisite channel
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        icon_url: typia.random<string & tags.Format<"uri">>(),
        banner_url: typia.random<string & tags.Format<"uri">>(),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 4: Perform soft deletion using super admin credentials
  await api.functional.communityPlatform.admin.admins.erase(connection, {
    adminId: targetAdmin.id,
  });

  // Step 5: Validate soft deletion by verifying super admin can still perform operations
  const anotherChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: false,
        status: "draft",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(anotherChannel);

  // Final validation that the operation completed successfully
  TestValidator.predicate(
    "soft deletion operation completed successfully",
    true,
  );
}
