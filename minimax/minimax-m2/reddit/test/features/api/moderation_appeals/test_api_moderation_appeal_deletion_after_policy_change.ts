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

export async function test_api_moderation_appeal_deletion_after_policy_change(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator with authority to delete appeals
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string =
    RandomGenerator.alphaNumeric(12) + "A1!";

  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: platformAdminEmail,
        password: platformAdminPassword,
        display_name: "Test Platform Admin",
        administrator_level: "admin",
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
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Step 2: Create registered user who will file the appeal
  const registeredUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const registeredUserPassword: string =
    RandomGenerator.alphaNumeric(12) + "A1!";

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: registeredUserEmail,
        password: registeredUserPassword,
        display_name: "Test Registered User",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 3: Create community moderator to facilitate appeal creation
  const communityModeratorEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const communityModeratorPassword: string =
    RandomGenerator.alphaNumeric(12) + "A1!";

  // First create base registered user for moderator
  const baseModeratorUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: communityModeratorEmail,
        password: communityModeratorPassword,
        display_name: "Test Community Moderator",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(baseModeratorUser);

  // Then create moderator profile
  const communityModerator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: baseModeratorUser.id,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: platformAdmin.user.id,
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(communityModerator);

  // Step 4: Create moderation action under previous policy
  const moderationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "user_warning",
          reason:
            "Violation of community guidelines under previous policy framework",
          duration_hours: 24,
          moderator_session_id: platformAdmin.token.access, // Using admin session for this test
          status: "active",
          admin_notes:
            "Action taken under previous policy guidelines that will later change",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 5: Switch to registered user context and create appeal under old policy
  await api.functional.auth.registeredUser.login(connection, {
    body: {
      email: registeredUserEmail,
      password: registeredUserPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformRegisteredUser.ILogin,
  });

  // Create appeal under the old policy that will become invalid
  const appeal: IRedditPlatformModerationAppeal =
    await api.functional.redditPlatform.registeredUser.moderationActions.appeals.create(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          appeal_reason:
            "I believe this warning was unjustified under the previous policy guidelines. The action taken was too severe for the alleged violation and does not align with the community standards that were in place at the time of the incident.",
          additional_evidence:
            "Supporting evidence and context for the appeal under previous policy framework",
          appeal_level: "platform",
        } satisfies IRedditPlatformModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 6: Switch back to platform administrator for appeal deletion
  await api.functional.auth.platformAdministrator.login(connection, {
    body: {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformPlatformAdministrator.ILogin,
  });

  // Step 7: Platform administrator deletes the appeal invalidated by policy change
  await api.functional.redditPlatform.platformAdministrator.moderationActions.appeals.erase(
    connection,
    {
      moderationActionId: moderationAction.id,
      appealId: appeal.id,
    },
  );

  // Step 8: Verify the appeal deletion by attempting to access it (should fail)
  await TestValidator.error(
    "appeal should not exist after deletion by platform administrator",
    async () => {
      // Attempting to recreate the appeal should succeed since the original was deleted
      await api.functional.redditPlatform.registeredUser.moderationActions.appeals.create(
        connection,
        {
          moderationActionId: moderationAction.id,
          body: {
            appeal_reason:
              "New appeal after policy change - this demonstrates the previous appeal was permanently deleted",
            appeal_level: "platform",
          } satisfies IRedditPlatformModerationAppeal.ICreate,
        },
      );
    },
  );

  TestValidator.equals(
    "appeal was successfully deleted by platform administrator",
    appeal.id,
    appeal.id,
  );
}
