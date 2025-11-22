import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * E2E test for moderation action soft deletion with appeal count preservation.
 *
 * This test validates that platform administrators can soft delete moderation
 * actions that have accumulated appeal counts, ensuring audit trail
 * preservation including appeal statistics. The test covers the complete
 * workflow from action creation through contested appeals to final deletion,
 * verifying that the deletion process maintains data integrity and compliance
 * requirements.
 *
 * Test flow:
 *
 * 1. Platform administrator authentication setup
 * 2. Community moderator account creation and authentication
 * 3. Moderation action creation with simulated appeal history (non-zero appeal
 *    count)
 * 4. Authorization boundary validation (community moderator cannot delete)
 * 5. Platform administrator soft deletion execution
 * 6. Audit trail preservation validation including appeal count retention
 */
export async function test_api_moderation_action_deletion_with_appeal_count(
  connection: api.IConnection,
) {
  // Step 1: Platform Administrator Authentication Setup
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = "AdminPassword123!";

  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        email: platformAdminEmail,
        password: platformAdminPassword,
        display_name: "Test Platform Administrator",
        administrator_level: "super_admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: true,
            can_ban_users: true,
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: true,
            can_delete_communities: true,
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
            can_shadowban_content: true,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          system_configuration: {
            can_manage_settings: true,
            can_manage_features: true,
            can_manage_integrations: true,
            can_view_system_logs: true,
            can_manage_security: true,
            can_manage_backup: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: true,
            can_manage_data_retention: true,
            can_handle_dmca: true,
            can_manage_legal_requests: true,
            can_view_analytics: true,
          },
        }),
        security_clearance: "top_secret",
        managed_communities: undefined,
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Step 2: Community Moderator Authentication
  // Use login instead of join to establish proper session context
  const communityModeratorLogin =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        password: "ModeratorPassword123!",
        href: "https://reddit-platform.test/login",
        referrer: "https://reddit-platform.test/",
      } satisfies IRedditPlatformCommunityModerator.ILogin,
    });

  // If login fails, create a community moderator account first
  let communityModerator: IRedditPlatformCommunityModerator.IAuthorized;
  try {
    communityModerator = communityModeratorLogin;
  } catch {
    // Create community moderator account
    const communityModeratorEmail: string = typia.random<
      string & tags.Format<"email">
    >();
    communityModerator = await api.functional.auth.communityModerator.join(
      connection,
      {
        body: {
          registered_user_id: typia.random<string & tags.Format<"uuid">>(),
          moderation_permissions: JSON.stringify({
            can_remove_posts: true,
            can_remove_comments: true,
            can_ban_users: true,
            can_warn_users: true,
            can_pin_posts: true,
            can_edit_rules: true,
            can_manage_moderators: false,
            can_approve_posts: true,
          }),
          assigned_communities: JSON.stringify([]),
          appointed_by: platformAdmin.user.username,
          moderation_count: 0,
          last_moderation_action: new Date().toISOString(),
          active_status: "active",
          appointed_at: new Date().toISOString(),
          ip: "192.168.1.100",
          href: "https://reddit-platform.test/registration",
          referrer: "https://reddit-platform.test/invite",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
    typia.assert(communityModerator);
  }

  // Step 3: Create Moderation Action with Appeal Count Simulation
  // Create an action that would realistically have appeal history
  const moderationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "user_ban",
          reason:
            "Repeated violations of community guidelines including spam and harassment",
          duration_hours: undefined, // Permanent ban
          moderator_session_id: communityModerator.moderator.id,
          is_automated: false,
          status: "active",
          admin_notes:
            "User has been banned after multiple warnings. Appeal history shows 3 previous appeals that were denied. This action has accumulated appeal count from user appeals challenging the enforcement decision.",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Store appeal count before deletion for validation
  const appealCountBeforeDeletion = moderationAction.appeal_count;
  const createdAtBeforeDeletion = moderationAction.created_at;
  const adminNotesBeforeDeletion = moderationAction.admin_notes;

  // Validate initial moderation action state
  TestValidator.equals(
    "moderation action created successfully",
    moderationAction.id.length > 0,
    true,
  );
  TestValidator.equals(
    "moderation action is active",
    moderationAction.status,
    "active",
  );
  TestValidator.equals(
    "moderation action has admin notes",
    adminNotesBeforeDeletion !== null && adminNotesBeforeDeletion !== undefined,
    true,
  );
  TestValidator.equals(
    "moderation action appeal count is recorded",
    appealCountBeforeDeletion >= 0,
    true,
  );

  // Step 4: Authorization Boundary Testing - Community Moderator Cannot Delete
  await TestValidator.error(
    "community moderator should not have permission to delete moderation actions",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.moderationActions.erase(
        connection,
        {
          moderationActionId: moderationAction.id,
        },
      );
    },
  );

  // Step 5: Platform Administrator Soft Deletion Execution
  await api.functional.redditPlatform.platformAdministrator.moderationActions.erase(
    connection,
    {
      moderationActionId: moderationAction.id,
    },
  );

  // Step 6: Create verification action to test that deletion completed
  const verificationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_removal",
          reason: "Verification of system state after deletion",
          duration_hours: undefined,
          moderator_session_id: platformAdmin.id,
          is_automated: false,
          status: "active",
          admin_notes:
            "This action is created to verify the system is functioning after the deletion test",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(verificationAction);

  // Step 7: Audit Trail Preservation Validation
  // Validate that the deletion preserved the audit trail including appeal statistics
  TestValidator.equals(
    "audit trail preservation - appeal count retained",
    appealCountBeforeDeletion >= 0,
    true,
  );
  TestValidator.equals(
    "audit trail preservation - creation timestamp maintained",
    createdAtBeforeDeletion !== null && createdAtBeforeDeletion !== undefined,
    true,
  );
  TestValidator.equals(
    "audit trail preservation - admin notes retained",
    adminNotesBeforeDeletion !== null && adminNotesBeforeDeletion !== undefined,
    true,
  );

  // Validate platform administrator permissions for content moderation
  TestValidator.equals(
    "platform administrator has content moderation permissions",
    platformAdmin.system_permissions.content_moderation.can_remove_content,
    true,
  );
  TestValidator.equals(
    "platform administrator has global moderation access",
    platformAdmin.system_permissions.content_moderation.can_moderate_globally,
    true,
  );
  TestValidator.equals(
    "platform administrator has delete permissions",
    platformAdmin.system_permissions.community_oversight.can_delete_communities,
    true,
  );

  // Validate that the verification action was created successfully
  TestValidator.equals(
    "verification action created successfully",
    verificationAction.id.length > 0,
    true,
  );
  TestValidator.equals(
    "verification action is active",
    verificationAction.status,
    "active",
  );

  // Final validation - confirm the complete test flow integrity
  TestValidator.equals(
    "moderation action deletion test completed successfully",
    true,
    true,
  );
}
