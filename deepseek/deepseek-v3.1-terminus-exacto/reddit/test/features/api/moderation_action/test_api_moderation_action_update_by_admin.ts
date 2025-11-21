import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test administrator privileges for moderation action updates with proper error
 * handling.
 *
 * Since the available API functions only provide update capability but not
 * create capability, this test validates that administrators have proper
 * authentication and authorization for moderation action operations. It tests
 * error handling when attempting to update non-existent moderation actions,
 * ensuring the system properly validates action existence and administrator
 * permissions.
 *
 * Key Steps:
 *
 * 1. Create administrator account for authentication
 * 2. Attempt to update a non-existent moderation action
 * 3. Validate proper error handling for invalid action IDs
 * 4. Verify administrator authentication is properly established
 */
export async function test_api_moderation_action_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to update a non-existent moderation action
  // Since we don't have a create API, we test error handling for invalid IDs
  const nonExistentActionId = typia.random<string & tags.Format<"uuid">>();

  const updateData = {
    action_type: "content_removal",
    reason: "Test update reason",
    status: "active",
    severity_level: "medium",
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  // Step 3: Validate proper error handling for invalid action IDs
  await TestValidator.error(
    "should fail when updating non-existent moderation action",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.update(
        connection,
        {
          moderationActionId: nonExistentActionId,
          body: updateData,
        },
      );
    },
  );

  // Step 4: Verify administrator authentication is properly established
  TestValidator.predicate(
    "admin authentication should be established",
    admin.id !== undefined && admin.id.length > 0,
  );
  TestValidator.predicate(
    "admin email should match created account",
    admin.email === adminEmail,
  );
  TestValidator.predicate(
    "admin should have valid token",
    admin.token !== undefined &&
      admin.token.access !== undefined &&
      admin.token.access.length > 0,
  );
}
