import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderation action creation with critical severity level for
 * high-priority enforcement actions.
 *
 * This test validates that authenticated moderators can create moderation
 * actions with critical severity level, which are used for actions requiring
 * immediate attention. The test ensures proper authentication, correct field
 * population, and appropriate status assignment for critical severity actions.
 */
export async function test_api_moderation_action_critical_severity_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "global",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create moderation action with critical severity level
  const moderationAction =
    await api.functional.communityPlatform.moderator.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_removal",
          target_type: "community",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          severity_level: "critical",
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Validate critical severity action properties
  TestValidator.equals(
    "action type matches input",
    moderationAction.action_type,
    "content_removal",
  );
  TestValidator.equals(
    "target type matches input",
    moderationAction.target_type,
    "community",
  );
  TestValidator.equals(
    "severity level is critical",
    moderationAction.severity_level,
    "critical",
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    moderationAction.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    moderationAction.updated_at !== undefined,
  );

  // Step 4: Validate target entity structure
  typia.assert(moderationAction.target);
  TestValidator.predicate(
    "target has valid UUID",
    moderationAction.target.id.length > 0,
  );
  TestValidator.predicate(
    "target has name",
    moderationAction.target.name.length > 0,
  );
  TestValidator.predicate(
    "target has status",
    moderationAction.target.status.length > 0,
  );
  TestValidator.predicate(
    "target has created_at timestamp",
    moderationAction.target.created_at !== undefined,
  );

  // Step 5: Validate critical severity specific business rules
  TestValidator.predicate(
    "critical actions should have appropriate status",
    moderationAction.status === "active" ||
      moderationAction.status === "pending",
  );
  TestValidator.predicate(
    "escalation level should be properly set",
    moderationAction.escalation_level >= 1,
  );
}
