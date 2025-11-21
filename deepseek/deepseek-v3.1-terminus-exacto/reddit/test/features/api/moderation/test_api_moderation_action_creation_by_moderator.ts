import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test the complete moderation action creation workflow for a moderator.
 *
 * This E2E test validates that a moderator can successfully create a moderation
 * action after proper authentication. The test creates a moderator account,
 * authenticates it, then creates a moderation action targeting content removal
 * with detailed reasoning and appropriate severity level. The response is
 * validated to ensure all required fields are properly recorded and the action
 * status is correctly assigned.
 */
export async function test_api_moderation_action_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
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

  // Step 2: Create moderation action targeting content removal
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const durationHours = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<24>
  >();
  const appealDeadline = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const moderationAction =
    await api.functional.communityPlatform.moderator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_removal",
          target_type: "post",
          target_id: targetId,
          reason: reason,
          severity_level: "medium",
          duration_hours: durationHours,
          appeal_deadline: appealDeadline,
          escalation_level: 1,
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Validate the moderation action response comprehensively
  TestValidator.equals(
    "action type matches",
    moderationAction.action_type,
    "content_removal",
  );
  TestValidator.equals(
    "target type matches",
    moderationAction.target_type,
    "post",
  );
  TestValidator.equals(
    "severity level matches",
    moderationAction.severity_level,
    "medium",
  );
  TestValidator.equals(
    "escalation level is 1",
    moderationAction.escalation_level,
    1,
  );
  TestValidator.equals("reason matches input", moderationAction.reason, reason);

  // Validate target entity structure
  typia.assert(moderationAction.target);
  TestValidator.equals(
    "target ID matches",
    moderationAction.target.id,
    targetId,
  );
  TestValidator.predicate(
    "target name is valid string",
    typeof moderationAction.target.name === "string" &&
      moderationAction.target.name.length > 0,
  );
  TestValidator.predicate(
    "target status is valid",
    typeof moderationAction.target.status === "string" &&
      moderationAction.target.status.length > 0,
  );
  TestValidator.predicate(
    "target created_at is valid timestamp",
    new Date(moderationAction.target.created_at).getTime() > 0,
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp is recent",
    new Date(moderationAction.created_at).getTime() > Date.now() - 60000,
  );
  TestValidator.predicate(
    "updated_at timestamp is recent",
    new Date(moderationAction.updated_at).getTime() > Date.now() - 60000,
  );

  // Validate status field
  TestValidator.predicate(
    "status is valid",
    typeof moderationAction.status === "string" &&
      moderationAction.status.length > 0,
  );

  // Validate duration and expiration if duration is set
  if (durationHours !== undefined) {
    TestValidator.equals(
      "duration_hours matches input",
      moderationAction.duration_hours,
      durationHours,
    );
    TestValidator.predicate(
      "expires_at is set for temporary action",
      moderationAction.expires_at !== undefined,
    );
    if (moderationAction.expires_at) {
      TestValidator.predicate(
        "expires_at is in the future",
        new Date(moderationAction.expires_at).getTime() > Date.now(),
      );
    }
  }

  // Validate appeal deadline if set
  if (appealDeadline !== undefined) {
    TestValidator.equals(
      "appeal_deadline matches input",
      moderationAction.appeal_deadline,
      appealDeadline,
    );
  }

  // Validate UUID format
  TestValidator.predicate(
    "moderation action ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderationAction.id,
    ),
  );
}
