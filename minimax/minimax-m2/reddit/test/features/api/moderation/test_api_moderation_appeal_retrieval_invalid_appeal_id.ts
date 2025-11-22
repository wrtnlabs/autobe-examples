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

export async function test_api_moderation_appeal_retrieval_invalid_appeal_id(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account for creating moderation actions
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const platformAdministrator: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
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
        managed_communities: JSON.stringify([]),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdministrator);

  // Step 2: Create a valid moderation action for appeal ID reference testing
  const moderationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_removal",
          reason: "Test content violation for appeal testing",
          duration_hours: 24,
          moderator_session_id: platformAdministrator.id,
          status: "active",
          admin_notes: "Created for testing invalid appeal ID retrieval",
          is_automated: false,
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Create and authenticate community moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorAccount: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: false,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([]),
        appointed_by: platformAdministrator.id,
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        ip: "192.168.1.100",
        href: "https://moderator.example.com/join",
        referrer: "https://admin.example.com/invite",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  // Step 4: Generate invalid appeal ID for testing (non-existent UUID)
  const invalidAppealId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Attempt to retrieve appeal with invalid appeal ID using authenticated moderator session
  await TestValidator.error(
    "should fail when retrieving appeal with non-existent appeal ID",
    async () => {
      await api.functional.redditPlatform.communityModerator.moderationActions.appeals.at(
        connection,
        {
          moderationActionId: moderationAction.id,
          appealId: invalidAppealId,
        },
      );
    },
  );

  // Step 6: Test with malformed UUID format
  const malformedAppealId: string = "invalid-uuid-format";
  await TestValidator.error(
    "should fail when retrieving appeal with malformed appeal ID",
    async () => {
      await api.functional.redditPlatform.communityModerator.moderationActions.appeals.at(
        connection,
        {
          moderationActionId: moderationAction.id,
          appealId: malformedAppealId,
        },
      );
    },
  );

  // Step 7: Test with empty appeal ID
  const emptyAppealId: string = "";
  await TestValidator.error(
    "should fail when retrieving appeal with empty appeal ID",
    async () => {
      await api.functional.redditPlatform.communityModerator.moderationActions.appeals.at(
        connection,
        {
          moderationActionId: moderationAction.id,
          appealId: emptyAppealId,
        },
      );
    },
  );
}
