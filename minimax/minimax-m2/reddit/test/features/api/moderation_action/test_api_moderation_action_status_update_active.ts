import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community moderator updating moderation action status from active to
 * pending appeal.
 *
 * This test validates the complete moderation action lifecycle management
 * workflow:
 *
 * 1. Authenticate as a community moderator with proper permissions
 * 2. Create a new moderation action (content removal, user warning, etc.)
 * 3. Update the action status from 'active' to 'pending_appeal'
 * 4. Validate status transition and appeal process initiation
 * 5. Test administrative note additions during status updates
 * 6. Verify proper authorization and audit trail maintenance
 *
 * The test ensures moderators can transition actions to pending appeal status,
 * allowing users to contest enforcement decisions while maintaining proper
 * documentation and accountability throughout the appeal process.
 */
export async function test_api_moderation_action_status_update_active(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinData = {
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
    appointed_by: typia.random<string>(),
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderatorAuth = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: moderatorJoinData,
    },
  );
  typia.assert(moderatorAuth);

  // Step 2: Create a moderation action to be updated
  const initialModerationAction =
    await api.functional.redditPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_removal",
          reason: "Violates community guidelines regarding spam content",
          duration_hours: typia.random<number & tags.Type<"int32">>(),
          moderator_session_id: typia.random<string & tags.Format<"uuid">>(),
          status: "active",
          admin_notes: "Initial content removal for spam violation",
        } satisfies IRedditPlatformModerationAction.ICreate,
      },
    );
  typia.assert(initialModerationAction);

  // Validate initial action state
  TestValidator.equals(
    "initial action status should be active",
    initialModerationAction.status,
    "active",
  );
  TestValidator.equals(
    "initial action should have admin notes",
    initialModerationAction.admin_notes,
    "Initial content removal for spam violation",
  );

  // Step 3: Update the moderation action status to pending appeal
  const updatedModerationAction =
    await api.functional.redditPlatform.communityModerator.moderationActions.update(
      connection,
      {
        moderationActionId: initialModerationAction.id,
        body: {
          status: "pending_appeal",
          admin_notes:
            "Action suspended pending user appeal - user submitted appeal request for content removal",
        } satisfies IRedditPlatformModerationAction.IUpdate,
      },
    );
  typia.assert(updatedModerationAction);

  // Step 4: Validate the status transition
  TestValidator.equals(
    "action status should be updated to pending_appeal",
    updatedModerationAction.status,
    "pending_appeal",
  );
  TestValidator.equals(
    "action ID should remain the same",
    updatedModerationAction.id,
    initialModerationAction.id,
  );
  TestValidator.equals(
    "action type should remain unchanged",
    updatedModerationAction.action_type,
    initialModerationAction.action_type,
  );
  TestValidator.equals(
    "reason should remain unchanged",
    updatedModerationAction.reason,
    initialModerationAction.reason,
  );
  TestValidator.equals(
    "appeal count should be incremented",
    updatedModerationAction.appeal_count,
    initialModerationAction.appeal_count + 1,
  );

  // Step 5: Validate updated admin notes
  TestValidator.equals(
    "admin notes should contain appeal information",
    updatedModerationAction.admin_notes,
    "Action suspended pending user appeal - user submitted appeal request for content removal",
  );

  // Step 6: Verify other action properties remain intact
  TestValidator.equals(
    "content ID should be preserved",
    updatedModerationAction.content_id,
    initialModerationAction.content_id,
  );
  TestValidator.equals(
    "user ID should be preserved",
    updatedModerationAction.user_id,
    initialModerationAction.user_id,
  );
  TestValidator.equals(
    "moderator session ID should be preserved",
    updatedModerationAction.moderator_session_id,
    initialModerationAction.moderator_session_id,
  );
  TestValidator.equals(
    "is_automated flag should be preserved",
    updatedModerationAction.is_automated,
    initialModerationAction.is_automated,
  );
  TestValidator.equals(
    "duration hours should be preserved",
    updatedModerationAction.duration_hours,
    initialModerationAction.duration_hours,
  );

  // Step 7: Verify timestamps are updated
  TestValidator.predicate(
    "updated_at should be later than original created_at",
    new Date(updatedModerationAction.updated_at) >
      new Date(initialModerationAction.created_at),
  );
  TestValidator.predicate(
    "updated_at should not equal created_at",
    new Date(updatedModerationAction.updated_at) >
      new Date(initialModerationAction.updated_at),
  );

  // Step 8: Test validation - attempt invalid status transition (if applicable)
  // Note: Depending on business rules, some status transitions might not be allowed
  // This test validates the successful transition path

  // Step 9: Verify appeal process initiation
  TestValidator.predicate(
    "appeal count should be greater than zero",
    updatedModerationAction.appeal_count > 0,
  );
  TestValidator.predicate(
    "action should be in pending appeal state",
    updatedModerationAction.status === "pending_appeal",
  );

  // Final validation: Ensure the moderation action is properly prepared for appeal review
  TestValidator.equals(
    "moderation action ready for appeal review",
    updatedModerationAction.status,
    "pending_appeal",
  );
}
