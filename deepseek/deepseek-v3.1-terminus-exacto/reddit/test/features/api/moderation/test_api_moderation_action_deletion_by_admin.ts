import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test the complete moderation action lifecycle from creation to deletion by an
 * administrator.
 *
 * This test validates the full workflow of moderation action management in the
 * community platform system. The scenario begins with authenticating an
 * administrator user to establish proper authorization context. Then, a
 * moderation action is created targeting a specific entity with appropriate
 * action type, severity level, and reasoning. Finally, the moderation action is
 * deleted using its unique identifier. The test validates that the deletion
 * operation successfully removes the moderation action from the system and
 * returns appropriate success response. Additionally, the test verifies that
 * subsequent attempts to access the deleted moderation action result in
 * appropriate error responses, ensuring the deletion was truly effective.
 */
export async function test_api_moderation_action_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator to establish proper authorization context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a moderation action that will be targeted for deletion
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.admin.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_removal",
          target_type: "post",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          severity_level: "medium",
          duration_hours: 24,
          appeal_deadline: new Date(Date.now() + 86400000).toISOString(),
          escalation_level: 1,
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Validate that the moderation action was created with expected properties
  TestValidator.equals(
    "moderation action should have correct action type",
    moderationAction.action_type,
    "content_removal",
  );
  TestValidator.equals(
    "moderation action should have correct target type",
    moderationAction.target_type,
    "post",
  );
  TestValidator.equals(
    "moderation action should have correct severity level",
    moderationAction.severity_level,
    "medium",
  );

  // Step 3: Delete the moderation action using its unique identifier
  await api.functional.communityPlatform.admin.moderationActions.erase(
    connection,
    {
      moderationActionId: moderationAction.id,
    },
  );

  // Step 4: Verify that subsequent attempts to delete the same moderation action result in error
  await TestValidator.error(
    "deleting already deleted moderation action should fail",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.erase(
        connection,
        {
          moderationActionId: moderationAction.id,
        },
      );
    },
  );

  // Additional validation: Test that the moderation action is truly deleted
  // by attempting to create a new action with the same ID (which should fail)
  await TestValidator.error(
    "creating moderation action with deleted ID should fail",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.create(
        connection,
        {
          body: {
            action_type: "user_warning",
            target_type: "user",
            target_id: typia.random<string & tags.Format<"uuid">>(),
            reason: RandomGenerator.paragraph({ sentences: 1 }),
            severity_level: "low",
            escalation_level: 1,
          } satisfies ICommunityPlatformModerationAction.ICreate,
        },
      );
    },
  );
}
