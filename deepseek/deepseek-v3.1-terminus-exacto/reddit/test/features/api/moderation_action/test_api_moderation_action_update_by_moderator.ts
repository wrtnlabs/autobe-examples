import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test that moderators can successfully update existing moderation actions with
 * new information.
 *
 * This scenario validates the complete workflow of creating a moderation action
 * as an admin, then having a moderator update it with new status, severity
 * level, or reasoning information. The test verifies that only authorized
 * moderators can modify actions, proper status transitions are enforced, and
 * all updated fields are correctly persisted in the system.
 */
export async function test_api_moderation_action_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create administrator account to establish initial moderation action
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!" satisfies string as string,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create initial moderation action as admin that will be updated by moderator
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.admin.moderationActions.create(
      connection,
      {
        body: {
          action_type: "user_warning",
          target_type: "user",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          severity_level: "medium",
          duration_hours: 24,
          appeal_deadline: new Date(Date.now() + 86400000).toISOString(),
          escalation_level: 1,
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 3. Create moderator account to perform the update operation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "global",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 4. Update the moderation action with new information as moderator
  const updatedModerationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.moderator.moderationActions.update(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          action_type: "temporary_ban",
          reason:
            "Updated reason: User violated community guidelines multiple times",
          status: "active",
          severity_level: "high",
          duration_hours: 48,
          appeal_deadline: new Date(Date.now() + 172800000).toISOString(),
          escalation_level: 2,
        } satisfies ICommunityPlatformModerationAction.IUpdate,
      },
    );
  typia.assert(updatedModerationAction);

  // 5. Verify the updated moderation action reflects all changes correctly
  TestValidator.equals(
    "action type should be updated",
    updatedModerationAction.action_type,
    "temporary_ban",
  );
  TestValidator.equals(
    "reason should be updated",
    updatedModerationAction.reason,
    "Updated reason: User violated community guidelines multiple times",
  );
  TestValidator.equals(
    "status should be updated",
    updatedModerationAction.status,
    "active",
  );
  TestValidator.equals(
    "severity level should be updated",
    updatedModerationAction.severity_level,
    "high",
  );
  TestValidator.equals(
    "duration hours should be updated",
    updatedModerationAction.duration_hours,
    48,
  );
  TestValidator.equals(
    "escalation level should be updated",
    updatedModerationAction.escalation_level,
    2,
  );

  // 6. Verify that the original ID and target information remain unchanged
  TestValidator.equals(
    "ID should remain the same",
    updatedModerationAction.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "target type should remain unchanged",
    updatedModerationAction.target_type,
    moderationAction.target_type,
  );
  TestValidator.equals(
    "target should remain unchanged",
    updatedModerationAction.target,
    moderationAction.target,
  );

  // 7. Validate that timestamps are properly updated
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedModerationAction.updated_at) >
      new Date(moderationAction.created_at),
  );
  TestValidator.predicate(
    "updated_at should be newer than original updated_at",
    new Date(updatedModerationAction.updated_at) >
      new Date(moderationAction.updated_at),
  );
}
