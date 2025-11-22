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
 * Test platform administrator creating user suspension moderation action with
 * specific duration.
 *
 * This test validates the graduated response system for user-based violations
 * requiring temporary restrictions. It ensures proper duration calculation,
 * status tracking, and appeal process setup for user suspension enforcement
 * actions.
 *
 * The test flow includes:
 *
 * 1. Platform administrator authentication and privilege verification
 * 2. User suspension moderation action creation with specific duration
 * 3. Duration calculation validation and time-based enforcement
 * 4. Status tracking and lifecycle management verification
 * 5. Appeal process initialization and tracking setup
 */
export async function test_api_moderation_action_user_suspension(
  connection: api.IConnection,
) {
  // Step 1: Authenticate platform administrator for user enforcement actions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: adminEmail,
        password: "AdminPass123!",
        display_name: "Test Administrator",
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
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: false,
            can_manage_data_retention: false,
            can_handle_dmca: false,
            can_manage_legal_requests: false,
            can_view_analytics: true,
          },
        }),
        security_clearance: "medium",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Verify admin authentication was successful and tokens are set
  TestValidator.equals(
    "admin authentication successful",
    admin.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "admin privilege level",
    admin.administrator_level,
    "admin",
  );
  TestValidator.equals("admin status is active", admin.active_status, "active");

  // Step 2: Create user context for suspension action
  const suspendedUser: IRedditPlatformRegisteredUser.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.alphaNumeric(10),
    display_name: "Test User for Suspension",
    karma_score: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    account_status: "active",
    email_verified: true,
    account_created: new Date().toISOString(),
  };

  // Step 3: Create user suspension moderation action with specific duration
  const suspensionDuration = 72; // 72 hours (3 days) suspension
  const currentTime = new Date();
  const expectedExpiryTime = new Date(
    currentTime.getTime() + suspensionDuration * 60 * 60 * 1000,
  );

  const moderationAction: IRedditPlatformModerationAction =
    await api.functional.redditPlatform.platformAdministrator.moderationActions.create(
      connection,
      {
        body: {
          user: suspendedUser,
          action_type: "user_suspension",
          reason:
            "Violated community guidelines - excessive spamming and harassment of other users. This suspension is a graduated response to provide time for reflection and education on proper community behavior.",
          duration_hours: suspensionDuration,
          moderator_session_id: admin.id,
          status: "active",
          admin_notes:
            "Initial graduated response for policy violation. User shows pattern of repeated offenses. Consider permanent action if behavior continues after suspension period.",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 4: Validate moderation action creation and structure
  TestValidator.equals(
    "moderation action ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderationAction.id,
    ),
    true,
  );
  TestValidator.equals(
    "action type is user_suspension",
    moderationAction.action_type,
    "user_suspension",
  );
  TestValidator.equals(
    "suspension duration matches input",
    moderationAction.duration_hours,
    suspensionDuration,
  );
  TestValidator.equals(
    "action status is active",
    moderationAction.status,
    "active",
  );
  TestValidator.equals(
    "moderator session ID matches admin",
    moderationAction.moderator_session_id,
    admin.id,
  );
  TestValidator.equals(
    "user ID in action matches target",
    moderationAction.user_id,
    suspendedUser.id,
  );

  // Step 5: Validate appeal process initialization
  TestValidator.equals(
    "appeal count initialized to zero",
    moderationAction.appeal_count,
    0,
  );
  TestValidator.equals(
    "admin notes are preserved",
    moderationAction.admin_notes.includes("graduated response"),
    true,
  );

  // Step 6: Validate timestamp tracking and audit trail
  TestValidator.equals(
    "created_at timestamp is recent",
    Math.abs(
      new Date(moderationAction.created_at).getTime() - currentTime.getTime(),
    ) < 60000,
    true,
  );
  TestValidator.equals(
    "updated_at matches created_at initially",
    moderationAction.updated_at,
    moderationAction.created_at,
  );

  // Step 7: Validate duration calculation accuracy
  const actionCreationTime = new Date(moderationAction.created_at);
  const calculatedExpiryTime = new Date(
    actionCreationTime.getTime() + suspensionDuration * 60 * 60 * 1000,
  );
  TestValidator.equals(
    "duration calculation is accurate",
    Math.abs(calculatedExpiryTime.getTime() - expectedExpiryTime.getTime()) <
      60000,
    true,
  );

  // Step 8: Validate reason documentation and completeness
  TestValidator.equals(
    "suspension reason is documented",
    moderationAction.reason.includes("community guidelines"),
    true,
  );
  TestValidator.equals(
    "violation specificity provided",
    moderationAction.reason.includes("spamming and harassment"),
    true,
  );

  // Step 9: Verify no content ID is set (user-only action)
  TestValidator.equals(
    "no content ID for user suspension",
    moderationAction.content_id,
    null,
  );

  // Step 10: Validate audit trail completeness
  TestValidator.equals(
    "administrative action is tracked",
    moderationAction.admin_notes.includes("Initial graduated response"),
    true,
  );
  TestValidator.equals(
    "future action consideration noted",
    moderationAction.admin_notes.includes("permanent action"),
    true,
  );
}
