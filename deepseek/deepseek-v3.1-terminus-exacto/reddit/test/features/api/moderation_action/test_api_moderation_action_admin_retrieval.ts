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
 * Test that administrators can retrieve detailed information about specific
 * moderation actions after they have been created. This validates the complete
 * moderation workflow where an administrator needs to review moderation actions
 * for oversight, appeals handling, or escalation management. The scenario
 * ensures that administrators can access comprehensive moderation action
 * details including action type, target information, reason, status, severity
 * level, and timing information for proper moderation system transparency and
 * accountability.
 */
export async function test_api_moderation_action_admin_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        moderator_level: "global",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Authenticate as moderator before creating moderation action
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 3: Moderator creates a moderation action
  const moderationActionData = {
    action_type: "content_removal",
    target_type: "post",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.content({ paragraphs: 1 }),
    severity_level: "medium",
    duration_hours: 24,
    appeal_deadline: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    escalation_level: 1,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.moderator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(createdAction);

  // Authenticate as administrator before retrieving moderation action
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Administrator retrieves the moderation action details
  const retrievedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.admin.moderationActions.at(
      connection,
      {
        moderationActionId: createdAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Step 5: Validate that retrieved action matches created action
  TestValidator.equals(
    "moderation action ID matches",
    retrievedAction.id,
    createdAction.id,
  );
  TestValidator.equals(
    "action type matches",
    retrievedAction.action_type,
    createdAction.action_type,
  );
  TestValidator.equals(
    "target type matches",
    retrievedAction.target_type,
    createdAction.target_type,
  );
  TestValidator.equals(
    "reason matches",
    retrievedAction.reason,
    createdAction.reason,
  );
  TestValidator.equals(
    "severity level matches",
    retrievedAction.severity_level,
    createdAction.severity_level,
  );
  TestValidator.equals("status is active", retrievedAction.status, "active");
  TestValidator.equals(
    "escalation level matches",
    retrievedAction.escalation_level,
    createdAction.escalation_level,
  );

  // Validate target information structure
  TestValidator.equals(
    "target ID matches",
    retrievedAction.target.id,
    createdAction.target.id,
  );
  TestValidator.predicate(
    "target name is present",
    retrievedAction.target.name.length > 0,
  );
  TestValidator.predicate(
    "target status is present",
    retrievedAction.target.status.length > 0,
  );
  TestValidator.predicate(
    "target created_at is valid date",
    new Date(retrievedAction.target.created_at).getTime() > 0,
  );

  // Validate timing information
  TestValidator.predicate(
    "created_at is valid date",
    new Date(retrievedAction.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(retrievedAction.updated_at).getTime() > 0,
  );

  // Validate duration and appeal deadline if present
  if (retrievedAction.duration_hours !== undefined) {
    TestValidator.equals(
      "duration hours matches",
      retrievedAction.duration_hours,
      createdAction.duration_hours,
    );
  }

  if (retrievedAction.appeal_deadline !== undefined) {
    TestValidator.predicate(
      "appeal deadline is valid date",
      new Date(retrievedAction.appeal_deadline).getTime() > 0,
    );
  }

  // Validate expiration if present
  if (retrievedAction.expires_at !== undefined) {
    TestValidator.predicate(
      "expires_at is valid date",
      new Date(retrievedAction.expires_at).getTime() > 0,
    );
  }
}
