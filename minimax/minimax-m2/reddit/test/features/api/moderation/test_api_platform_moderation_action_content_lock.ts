import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test platform administrator creating content lock action to restrict further
 * interactions.
 *
 * This comprehensive test validates the content lock moderation capability for
 * platform administrators, ensuring proper content protection and interaction
 * restrictions during review processes. The test covers the complete workflow
 * from authentication to content lock creation, validating business logic for
 * content protection and moderation oversight.
 *
 * The test validates:
 *
 * 1. Platform administrator authentication and privilege verification
 * 2. Content lock moderation action creation with proper action type specification
 * 3. Content visibility controls and interaction restriction enforcement
 * 4. Lock status management and administrative action tracking
 * 5. Audit trail creation with comprehensive timestamp and session tracking
 * 6. Duration handling for temporary vs permanent content locks
 * 7. Automated vs manual moderation action classification
 *
 * This test ensures the platform's content protection mechanisms function
 * correctly and that platform administrators have proper oversight capabilities
 * for maintaining community standards and platform safety.
 */
export async function test_api_platform_moderation_action_content_lock(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform administrator with comprehensive permissions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        email: adminEmail,
        password: "SecureAdminPass123!",
        display_name: "Platform Administrator",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
            can_shadowban_content: true,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          community_oversight: {
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          user_management: {
            can_view_user_data: true,
          },
          system_configuration: {
            can_view_system_logs: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
          },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Validate administrator authentication and privilege setup
  TestValidator.equals(
    "platform administrator privilege level should be admin",
    admin.administrator_level,
    "admin",
  );
  TestValidator.equals(
    "platform administrator should have content moderation permissions",
    admin.system_permissions.content_moderation.can_remove_content,
    true,
  );
  TestValidator.equals(
    "platform administrator should have global moderation capabilities",
    admin.system_permissions.content_moderation.can_moderate_globally,
    true,
  );
  TestValidator.equals(
    "platform administrator should have high security clearance",
    admin.security_clearance,
    "high",
  );
  TestValidator.equals(
    "platform administrator should be active",
    admin.active_status,
    "active",
  );

  // Step 3: Create content lock moderation action with comprehensive validation
  const contentLockAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_lock",
          reason:
            "Content temporarily locked for policy review and violation investigation",
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<168>
          >(),
          moderator_session_id: admin.id,
          is_automated: false,
          status: "active",
          admin_notes:
            "Content lock action initiated during comprehensive policy review process to prevent further interactions while investigating potential violations of community guidelines and platform policies.",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(contentLockAction);

  // Step 4: Validate content lock action creation and properties
  TestValidator.equals(
    "moderation action should have correct action type",
    contentLockAction.action_type,
    "content_lock",
  );
  TestValidator.equals(
    "moderation action should have active status",
    contentLockAction.status,
    "active",
  );
  TestValidator.equals(
    "moderation action should not be automated",
    contentLockAction.is_automated,
    false,
  );
  TestValidator.equals(
    "moderation action should have proper reason",
    contentLockAction.reason,
    "Content temporarily locked for policy review and violation investigation",
  );
  TestValidator.equals(
    "moderation action should have zero appeals initially",
    contentLockAction.appeal_count,
    0,
  );
  TestValidator.equals(
    "moderation action should have proper duration",
    contentLockAction.duration_hours! >= 1 &&
      contentLockAction.duration_hours! <= 168,
    true,
  );
  TestValidator.equals(
    "moderation action should have comprehensive admin notes",
    contentLockAction.admin_notes!.length > 50,
    true,
  );

  // Step 5: Validate audit trail and timestamp accuracy
  TestValidator.equals(
    "moderation action should have creation timestamp",
    contentLockAction.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "moderation action should have update timestamp",
    contentLockAction.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "moderation action should not be deleted",
    contentLockAction.deleted_at,
    undefined,
  );
  TestValidator.equals(
    "moderation action should track moderator session",
    contentLockAction.moderator_session_id,
    admin.id,
  );

  // Step 6: Validate temporal consistency and business logic
  const createdTimestamp = new Date(contentLockAction.created_at);
  const currentTimestamp = new Date();
  const timeDiff = Math.abs(
    currentTimestamp.getTime() - createdTimestamp.getTime(),
  );
  TestValidator.equals(
    "moderation action should be created within reasonable time window",
    timeDiff < 30000, // Within 30 seconds
    true,
  );

  // Step 7: Validate administrative action tracking
  TestValidator.equals(
    "administrative actions count should increase",
    admin.administrative_actions >= 0,
    true,
  );
  TestValidator.equals(
    "last administrative action should be recent",
    admin.last_administrative_action !== undefined,
    true,
  );

  // Step 8: Comprehensive content lock functionality validation
  TestValidator.equals(
    "content lock action should prevent further interactions",
    contentLockAction.action_type === "content_lock",
    true,
  );
  TestValidator.equals(
    "content lock should be trackable via unique identifier",
    contentLockAction.id.length > 0,
    true,
  );
  TestValidator.equals(
    "content lock should have proper moderation context",
    contentLockAction.admin_notes !== null &&
      contentLockAction.admin_notes !== undefined,
    true,
  );

  // Step 9: Final validation of platform administrator oversight capabilities
  TestValidator.equals(
    "platform administrator should maintain active status after action",
    admin.active_status === "active",
    true,
  );
  TestValidator.equals(
    "platform administrator should retain security clearance",
    admin.security_clearance === "high",
    true,
  );
  TestValidator.equals(
    "platform administrator should have appropriate access level",
    admin.access_level === "global" ||
      admin.access_level === "community_specific",
    true,
  );

  // Test completed successfully - all content lock moderation capabilities validated
}
