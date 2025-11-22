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

export async function test_api_platform_moderation_action_user_suspension(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account (authentication prerequisite)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "SecureAdmin123!",
        display_name: "Test Platform Admin",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: true,
            can_ban_users: false,
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
            can_shadowban_content: false,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: true,
            can_delete_communities: false,
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          system_configuration: {
            can_manage_settings: false,
            can_manage_features: false,
            can_manage_integrations: false,
            can_view_system_logs: true,
            can_manage_security: false,
            can_manage_backup: false,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: false,
            can_manage_data_retention: false,
            can_handle_dmca: false,
            can_manage_legal_requests: false,
            can_view_analytics: true,
          },
        }),
        security_clearance: "high",
        managed_communities: undefined,
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Step 2: Generate test user context for suspension target
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  const targetUser: IRedditPlatformRegisteredUser.ISummary = {
    id: targetUserId,
    username: RandomGenerator.alphaNumeric(10),
    display_name: "Test User for Suspension",
    avatar_url: undefined,
    karma_score: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    account_status: "active",
    email_verified: true,
    account_created: new Date().toISOString(),
  };

  // Step 3: Create user suspension action with specific duration (24 hours)
  const suspensionDuration = 24; // 24 hours suspension
  const suspensionReason =
    "Violated community guidelines - repeated inappropriate comments";

  const moderationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          user: targetUser,
          content: undefined, // User suspension, not content-specific
          action_type: "user_suspension",
          reason: suspensionReason,
          duration_hours: suspensionDuration,
          moderator_session_id: platformAdmin.token.access, // Using admin session for tracking
          status: "active",
          admin_notes: `Test suspension created via E2E test. User ${targetUser.username} suspended for ${suspensionDuration} hours due to repeated policy violations. Appeal process should be initiated through proper channels if user disputes this action.`,
          is_automated: false,
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 4: Validate suspension properties and duration enforcement
  TestValidator.equals(
    "suspension action type is user_suspension",
    moderationAction.action_type,
    "user_suspension",
  );
  TestValidator.equals(
    "suspension duration is correctly set",
    moderationAction.duration_hours,
    suspensionDuration,
  );
  TestValidator.equals(
    "suspension status is active",
    moderationAction.status,
    "active",
  );
  TestValidator.equals(
    "suspension reason is documented",
    moderationAction.reason,
    suspensionReason,
  );
  TestValidator.predicate(
    "suspension ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderationAction.id,
    ),
  );
  TestValidator.predicate(
    "moderator session is tracked",
    moderationAction.moderator_session_id.length > 0,
  );
  TestValidator.predicate(
    "appeal count is initialized to zero",
    moderationAction.appeal_count === 0,
  );
  TestValidator.predicate(
    "admin notes contain suspension details",
    moderationAction.admin_notes.includes(`${suspensionDuration} hours`),
  );
  TestValidator.predicate(
    "action is not automated",
    moderationAction.is_automated === false,
  );

  // Step 5: Verify audit trail and timestamps
  TestValidator.predicate(
    "creation timestamp is valid ISO format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      moderationAction.created_at,
    ),
  );
  TestValidator.predicate(
    "update timestamp matches creation",
    moderationAction.updated_at === moderationAction.created_at,
  );
  TestValidator.predicate(
    "deleted_at is null for active action",
    moderationAction.deleted_at === null,
  );
  TestValidator.predicate(
    "content_id is null for user suspension",
    moderationAction.content_id === null,
  );
  TestValidator.equals(
    "user_id matches target user",
    moderationAction.user_id,
    targetUserId,
  );

  // Step 6: Test boundary conditions - Create another suspension with different duration
  const shortSuspensionDuration = 2; // 2 hours for minor violation
  const shortSuspensionReason = "Minor policy violation - warning escalation";

  const shortSuspensionAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          user: targetUser,
          content: undefined,
          action_type: "user_suspension",
          reason: shortSuspensionReason,
          duration_hours: shortSuspensionDuration,
          moderator_session_id: platformAdmin.token.access,
          status: "active",
          admin_notes: `Short-term suspension for minor violation. Duration: ${shortSuspensionDuration} hours.`,
          is_automated: false,
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(shortSuspensionAction);

  // Validate short suspension
  TestValidator.equals(
    "short suspension duration is correctly set",
    shortSuspensionAction.duration_hours,
    shortSuspensionDuration,
  );
  TestValidator.equals(
    "short suspension reason is documented",
    shortSuspensionAction.reason,
    shortSuspensionReason,
  );
  TestValidator.predicate(
    "short suspension has different ID",
    shortSuspensionAction.id !== moderationAction.id,
  );

  // Step 7: Test duration limits - Maximum duration (168 hours = 7 days)
  const maxSuspensionDuration = 168; // 7 days maximum suspension
  const maxSuspensionReason =
    "Serious policy violation - maximum duration suspension";

  const maxSuspensionAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          user: targetUser,
          content: undefined,
          action_type: "user_suspension",
          reason: maxSuspensionReason,
          duration_hours: maxSuspensionDuration,
          moderator_session_id: platformAdmin.token.access,
          status: "active",
          admin_notes: `Maximum duration suspension. Duration: ${maxSuspensionDuration} hours (7 days). Requires review for extension beyond this period.`,
          is_automated: false,
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(maxSuspensionAction);

  // Validate maximum duration suspension
  TestValidator.equals(
    "maximum suspension duration is correctly set",
    maxSuspensionAction.duration_hours,
    maxSuspensionDuration,
  );
  TestValidator.equals(
    "maximum suspension reason is documented",
    maxSuspensionAction.reason,
    maxSuspensionReason,
  );
  TestValidator.predicate(
    "maximum suspension includes duration warning",
    maxSuspensionAction.admin_notes.includes("review for extension"),
  );

  // Step 8: Error handling test - Create suspension with zero duration (should be handled gracefully)
  await TestValidator.error(
    "suspension with zero duration should be rejected",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
        connection,
        {
          body: {
            user: targetUser,
            content: undefined,
            action_type: "user_suspension",
            reason: "Invalid duration test",
            duration_hours: 0,
            moderator_session_id: platformAdmin.token.access,
            status: "active",
            admin_notes: "This should fail due to zero duration",
            is_automated: false,
          } satisfies IRedditPlatformModerationAction.ICreate,
        },
      );
    },
  );

  // Step 9: Validate administrator context and permissions
  TestValidator.equals(
    "platform admin has high security clearance",
    platformAdmin.security_clearance,
    "high",
  );
  TestValidator.equals(
    "platform admin has suspend users permission",
    platformAdmin.system_permissions.user_management.can_suspend_users,
    true,
  );
  TestValidator.predicate(
    "platform admin access level is global",
    platformAdmin.access_level === "global",
  );
  TestValidator.predicate(
    "platform admin status is active",
    platformAdmin.active_status === "active",
  );
  TestValidator.predicate(
    "administrative actions count is tracked",
    typeof platformAdmin.administrative_actions === "number",
  );

  // Step 10: Final validation - Verify all suspension actions are properly tracked
  TestValidator.predicate(
    "all suspension actions have valid UUIDs",
    [
      moderationAction.id,
      shortSuspensionAction.id,
      maxSuspensionAction.id,
    ].every((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ),
    ),
  );

  TestValidator.predicate(
    "all suspension actions reference same user",
    [
      moderationAction.user_id,
      shortSuspensionAction.user_id,
      maxSuspensionAction.user_id,
    ].every((userId) => userId === targetUserId),
  );

  TestValidator.predicate(
    "all suspension actions use same moderator session",
    [
      moderationAction.moderator_session_id,
      shortSuspensionAction.moderator_session_id,
      maxSuspensionAction.moderator_session_id,
    ].every((sessionId) => sessionId === platformAdmin.token.access),
  );
}
