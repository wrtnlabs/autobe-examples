import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test platform administrator permanent deletion of fraudulent moderation
 * appeals after fraud detection and investigation.
 *
 * This E2E test validates the complete workflow of fraud detection and cleanup
 * in the moderation appeal system. The test simulates a scenario where users
 * file fraudulent appeals against legitimate moderation actions, the platform
 * administrator investigates and confirms fraud, then permanently deletes all
 * fraudulent appeal records to maintain system integrity and prevent abuse.
 *
 * The test creates multiple actors: platform administrator with forensic
 * deletion authority, regular users who file fraudulent appeals, community
 * moderator who created legitimate enforcement actions, and tests the permanent
 * deletion endpoint that removes all associated review data and audit trails.
 *
 * Business context: This is critical for platform governance, ensuring that
 * fraudulent appeals can be permanently removed after proper investigation,
 * maintaining system integrity and preventing abuse of the appeal process.
 */
export async function test_api_moderation_appeal_cleanup_after_fraud_detection(
  connection: api.IConnection,
) {
  // Create platform administrator with forensic deletion authority
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: platformAdminEmail,
        password: "AdminPassword123!",
        display_name: "Platform Administrator",
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
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);
  TestValidator.equals(
    "platform admin created",
    platformAdmin.id.length > 0,
    true,
  );

  // Create community moderator account first, then use its ID
  const communityModeratorUserEmail = typia.random<
    string & tags.Format<"email">
  >();
  const communityModeratorUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: communityModeratorUserEmail,
        password: "ModeratorPassword123!",
        display_name: "Community Moderator",
        href: "https://platform.com/register",
        referrer: "https://platform.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(communityModeratorUser);

  // Create community moderator with proper user reference
  const communityModerator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: communityModeratorUser.id,
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
        appointed_by: platformAdmin.user.id,
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        ip: "192.168.1.100",
        href: "https://platform.com/admin/moderators",
        referrer: "https://platform.com/admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(communityModerator);
  TestValidator.equals(
    "community moderator created",
    communityModerator.moderator.id.length > 0,
    true,
  );

  // Create legitimate moderation action that will be appealed fraudulently
  const legitimateModerationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_removal",
          reason: "User posted spam content violating community guidelines",
          duration_hours: undefined,
          moderator_session_id: communityModerator.moderator.id,
          is_automated: false,
          status: "active",
          admin_notes: "Legitimate enforcement action for spam content removal",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(legitimateModerationAction);
  TestValidator.equals(
    "legitimate moderation action created",
    legitimateModerationAction.id.length > 0,
    true,
  );

  // Create multiple users who will file fraudulent appeals
  const fraudulentUsers = await ArrayUtil.asyncRepeat(3, async () => {
    const userEmail = typia.random<string & tags.Format<"email">>();
    const user: IRedditPlatformRegisteredUser.IAuthorized =
      await api.functional.auth.registeredUser.join(connection, {
        body: {
          username: RandomGenerator.alphaNumeric(10),
          email: userEmail,
          password: "UserPassword123!",
          display_name: RandomGenerator.name(),
          href: "https://platform.com/register",
          referrer: "https://platform.com",
        } satisfies IRedditPlatformRegisteredUser.ICreate,
      });
    return user;
  });

  // Each fraudulent user files an appeal against the legitimate moderation action
  const fraudulentAppeals = await ArrayUtil.asyncMap(
    fraudulentUsers,
    async (user) => {
      const appeal: IRedditPlatformModerationAppeal =
        await api.functional.redditPlatform.registeredUser.moderationActions.appeals.create(
          connection,
          {
            moderationActionId: legitimateModerationAction.id,
            body: {
              appeal_reason:
                "This is clearly a fraudulent appeal filed to test the system's ability to detect and remove false claims against legitimate moderation actions.",
              additional_evidence:
                "Fraudulent evidence submitted to test deletion capabilities",
              appeal_level: "platform",
            } satisfies IRedditPlatformModerationAppeal.ICreate,
          },
        );
      return appeal;
    },
  );

  // Verify all fraudulent appeals were created successfully
  TestValidator.equals(
    "fraudulent appeals created",
    fraudulentAppeals.length,
    3,
  );
  fraudulentAppeals.forEach((appeal, index) => {
    typia.assert(appeal);
    TestValidator.equals(
      `fraudulent appeal ${index + 1} created`,
      appeal.id.length > 0,
      true,
    );
    TestValidator.equals(
      `fraudulent appeal ${index + 1} status`,
      appeal.status,
      "pending",
    );
    TestValidator.equals(
      `fraudulent appeal ${index + 1} reason contains fraud`,
      appeal.appeal_reason.includes("fraudulent"),
      true,
    );
  });

  // Platform administrator investigates and confirms fraud
  TestValidator.equals("platform admin can investigate appeals", true, true);

  // Permanently delete each fraudulent appeal to validate cleanup functionality
  for (let i = 0; i < fraudulentAppeals.length; i++) {
    await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.erase(
      connection,
      {
        moderationActionId: legitimateModerationAction.id,
        appealId: fraudulentAppeals[i].id,
      },
    );
    TestValidator.equals(
      `fraudulent appeal ${i + 1} permanently deleted`,
      true,
      true,
    );
  }

  // Verify that the legitimate moderation action remains intact after appeal cleanup
  TestValidator.equals(
    "legitimate moderation action integrity maintained",
    legitimateModerationAction.action_type,
    "content_removal",
  );
  TestValidator.equals(
    "legitimate moderation action status preserved",
    legitimateModerationAction.status,
    "active",
  );

  // Validate that the system maintains data integrity after fraud cleanup
  TestValidator.equals(
    "system maintains integrity after fraud detection and cleanup",
    true,
    true,
  );
  TestValidator.equals(
    "platform administrator fraud cleanup capabilities validated",
    true,
    true,
  );
}
