import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test that moderators can retrieve detailed information about their own
 * moderation actions for review and follow-up purposes. This validates the
 * moderation workflow where moderators need to check the status of actions
 * they've taken, handle appeals, or escalate issues.
 */
export async function test_api_moderation_action_moderator_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to establish authorization context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      moderator_level: RandomGenerator.pick([
        "community",
        "global",
        "super",
      ] as const),
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a moderation action that can be retrieved
  const moderationAction =
    await api.functional.communityPlatform.moderator.moderationActions.create(
      connection,
      {
        body: {
          action_type: RandomGenerator.pick([
            "content_removal",
            "user_warning",
            "temporary_ban",
            "permanent_ban",
          ] as const),
          target_type: "user",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          severity_level: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "critical",
          ] as const),
          duration_hours: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
          >(),
          appeal_deadline: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          escalation_level: 1,
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Retrieve the created moderation action
  const retrievedAction =
    await api.functional.communityPlatform.moderator.moderationActions.at(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Step 4: Validate that retrieved action matches created action
  TestValidator.equals(
    "action ID should match",
    retrievedAction.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "action type should match",
    retrievedAction.action_type,
    moderationAction.action_type,
  );
  TestValidator.equals(
    "target type should match",
    retrievedAction.target_type,
    moderationAction.target_type,
  );
  TestValidator.equals(
    "reason should match",
    retrievedAction.reason,
    moderationAction.reason,
  );
  TestValidator.equals(
    "severity level should match",
    retrievedAction.severity_level,
    moderationAction.severity_level,
  );
  TestValidator.equals(
    "status should be active",
    retrievedAction.status,
    "active",
  );
  TestValidator.equals(
    "escalation level should match",
    retrievedAction.escalation_level,
    1,
  );

  // Validate target entity structure
  TestValidator.predicate(
    "target should have ID",
    retrievedAction.target.id.length > 0,
  );
  TestValidator.predicate(
    "target should have name",
    retrievedAction.target.name.length > 0,
  );
  TestValidator.predicate(
    "target should have status",
    retrievedAction.target.status.length > 0,
  );
  TestValidator.predicate(
    "target should have creation timestamp",
    retrievedAction.target.created_at.length > 0,
  );

  // Validate timestamp fields
  TestValidator.predicate(
    "created_at timestamp should be valid",
    retrievedAction.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid",
    retrievedAction.updated_at.length > 0,
  );
  TestValidator.predicate(
    "appeal_deadline timestamp should be valid",
    retrievedAction.appeal_deadline !== undefined &&
      retrievedAction.appeal_deadline.length > 0,
  );

  // Validate duration for temporary actions
  if (moderationAction.action_type === "temporary_ban") {
    TestValidator.predicate(
      "duration hours should be set for temporary ban",
      retrievedAction.duration_hours !== undefined &&
        retrievedAction.duration_hours > 0,
    );
  }
}
