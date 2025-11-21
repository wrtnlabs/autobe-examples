import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderation action creation for different target types to ensure
 * comprehensive coverage. Create moderation actions targeting posts, comments,
 * users, communities, and messages with various action types and severity
 * levels. Validate that each target type is properly handled with appropriate
 * action types and that the system correctly processes different entity types.
 * Verify response consistency across different target types and action
 * combinations.
 */
export async function test_api_moderation_action_multiple_target_types_by_admin(
  connection: api.IConnection,
) {
  // Define realistic test combinations
  const testScenarios = [
    {
      targetType: "post",
      actionType: "content_removal",
      severityLevel: "medium",
    },
    {
      targetType: "comment",
      actionType: "comment_removal",
      severityLevel: "low",
    },
    { targetType: "user", actionType: "temporary_ban", severityLevel: "high" },
    {
      targetType: "user",
      actionType: "permanent_ban",
      severityLevel: "critical",
    },
    {
      targetType: "community",
      actionType: "post_lock",
      severityLevel: "medium",
    },
    { targetType: "message", actionType: "user_warning", severityLevel: "low" },
  ] as const;

  for (const scenario of testScenarios) {
    const { targetType, actionType, severityLevel } = scenario;

    // Generate realistic test data
    const targetId = typia.random<string & tags.Format<"uuid">>();
    const reason = RandomGenerator.paragraph({ sentences: 3 });

    // Determine if action should have duration (temporary actions)
    const durationHours =
      actionType === "temporary_ban"
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
          >()
        : undefined;

    // Set appeal deadline for permanent bans
    const appealDeadline =
      actionType === "permanent_ban"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    // Create moderation action
    const moderationAction: ICommunityPlatformModerationAction =
      await api.functional.communityPlatform.admin.moderationActions.create(
        connection,
        {
          body: {
            action_type: actionType,
            target_type: targetType,
            target_id: targetId,
            reason: reason,
            severity_level: severityLevel,
            duration_hours: durationHours,
            appeal_deadline: appealDeadline,
            escalation_level: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          } satisfies ICommunityPlatformModerationAction.ICreate,
        },
      );

    // Validate response structure and data integrity
    typia.assert(moderationAction);

    // Verify response matches request data
    TestValidator.equals(
      `action type should match for ${targetType} with ${actionType}`,
      moderationAction.action_type,
      actionType,
    );
    TestValidator.equals(
      `target type should match for ${targetType} with ${actionType}`,
      moderationAction.target_type,
      targetType,
    );
    TestValidator.equals(
      `reason should match for ${targetType} with ${actionType}`,
      moderationAction.reason,
      reason,
    );
    TestValidator.equals(
      `severity level should match for ${targetType} with ${actionType}`,
      moderationAction.severity_level,
      severityLevel,
    );

    // Validate target summary structure
    TestValidator.predicate(
      `target summary should have valid structure for ${targetType}`,
      typeof moderationAction.target.id === "string" &&
        typeof moderationAction.target.name === "string" &&
        typeof moderationAction.target.status === "string" &&
        typeof moderationAction.target.created_at === "string",
    );

    // Validate timestamp fields
    TestValidator.predicate(
      `created_at should be valid ISO date for ${targetType}`,
      !isNaN(new Date(moderationAction.created_at).getTime()),
    );
    TestValidator.predicate(
      `updated_at should be valid ISO date for ${targetType}`,
      !isNaN(new Date(moderationAction.updated_at).getTime()),
    );

    // Validate optional fields when present
    if (durationHours !== undefined) {
      TestValidator.equals(
        `duration hours should match for temporary action ${targetType}`,
        moderationAction.duration_hours,
        durationHours,
      );
      TestValidator.predicate(
        `expires_at should be set for temporary action ${targetType}`,
        moderationAction.expires_at !== undefined &&
          !isNaN(new Date(moderationAction.expires_at!).getTime()),
      );
    }

    if (appealDeadline !== undefined) {
      TestValidator.predicate(
        `appeal_deadline should be valid ISO date for permanent ban ${targetType}`,
        moderationAction.appeal_deadline !== undefined &&
          !isNaN(new Date(moderationAction.appeal_deadline!).getTime()),
      );
    }

    // Validate escalation level
    TestValidator.predicate(
      `escalation level should be positive integer for ${targetType}`,
      moderationAction.escalation_level >= 1,
    );

    // Validate status is properly set
    TestValidator.predicate(
      `status should be valid for ${targetType}`,
      [
        "pending",
        "active",
        "completed",
        "appealed",
        "overturned",
        "expired",
      ].includes(moderationAction.status),
    );
  }

  // Test business logic error - duplicate moderation action
  const duplicateTargetId = typia.random<string & tags.Format<"uuid">>();
  const duplicateReason = RandomGenerator.paragraph({ sentences: 2 });

  // Create first moderation action
  const firstAction =
    await api.functional.communityPlatform.admin.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_removal",
          target_type: "post",
          target_id: duplicateTargetId,
          reason: duplicateReason,
          severity_level: "medium",
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(firstAction);

  // Test creating duplicate action on same target
  await TestValidator.error(
    "should reject duplicate moderation action on same target",
    async () => {
      await api.functional.communityPlatform.admin.moderationActions.create(
        connection,
        {
          body: {
            action_type: "user_warning",
            target_type: "post",
            target_id: duplicateTargetId,
            reason: duplicateReason,
            severity_level: "low",
          } satisfies ICommunityPlatformModerationAction.ICreate,
        },
      );
    },
  );
}
