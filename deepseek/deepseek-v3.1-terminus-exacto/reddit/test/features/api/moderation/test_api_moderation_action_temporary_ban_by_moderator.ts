import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderation action creation for temporary user bans with duration
 * specifications.
 *
 * This E2E test validates that authenticated moderators can create temporary
 * ban actions targeting users, with proper duration specifications, severity
 * levels, and expiration timestamp calculations. The test ensures that
 * temporary ban actions include all required properties and follow the correct
 * moderation workflow.
 */
export async function test_api_moderation_action_temporary_ban_by_moderator(
  connection: api.IConnection,
) {
  // 1. Authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create a target user ID for the ban action (using proper UUID generation)
  const targetUserId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create temporary ban moderation action
  const banDurationHours = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
  >();
  const moderationAction =
    await api.functional.communityPlatform.moderator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "temporary_ban",
          target_type: "user",
          target_id: targetUserId,
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
          duration_hours: banDurationHours,
          appeal_deadline: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          escalation_level: 1,
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 4. Validate the moderation action properties
  TestValidator.equals(
    "action type should be temporary_ban",
    moderationAction.action_type,
    "temporary_ban",
  );
  TestValidator.equals(
    "target type should be user",
    moderationAction.target_type,
    "user",
  );
  TestValidator.equals(
    "duration hours should match input",
    moderationAction.duration_hours,
    banDurationHours,
  );
  TestValidator.equals(
    "escalation level should start at 1",
    moderationAction.escalation_level,
    1,
  );
  TestValidator.equals(
    "status should be active for new actions",
    moderationAction.status,
    "active",
  );

  // 5. Verify target entity information matches
  TestValidator.equals(
    "target ID should match input",
    moderationAction.target.id,
    targetUserId,
  );
  TestValidator.predicate(
    "target name should be a string",
    typeof moderationAction.target.name === "string",
  );
  TestValidator.predicate(
    "target status should be a string",
    typeof moderationAction.target.status === "string",
  );

  // 6. Validate expiration timestamp calculation
  TestValidator.predicate(
    "expiration timestamp should be set",
    moderationAction.expires_at !== undefined,
  );
  if (moderationAction.expires_at) {
    const expectedExpiration = new Date(
      Date.now() + banDurationHours * 60 * 60 * 1000,
    );
    const actualExpiration = new Date(moderationAction.expires_at);
    const timeDifference = Math.abs(
      expectedExpiration.getTime() - actualExpiration.getTime(),
    );
    TestValidator.predicate(
      "expiration should be approximately correct",
      timeDifference < 60000,
    );
  }

  // 7. Validate appeal deadline
  TestValidator.predicate(
    "appeal deadline should be set",
    moderationAction.appeal_deadline !== undefined,
  );
  if (moderationAction.appeal_deadline) {
    const appealDeadline = new Date(moderationAction.appeal_deadline);
    const now = new Date();
    TestValidator.predicate(
      "appeal deadline should be in the future",
      appealDeadline > now,
    );
  }
}
