import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderation action creation workflow for platform administrators.
 *
 * This test validates the creation of moderation actions targeting various
 * entity types (post, comment, user, community, message) with different action
 * types and severity levels. Since the endpoint has no authorization
 * requirements, the test focuses on comprehensive validation of the moderation
 * action creation process, including proper field population, status
 * assignment, and timestamp generation.
 *
 * The test covers:
 *
 * 1. Multiple target types with realistic entity IDs
 * 2. Various action types with appropriate severity levels
 * 3. Temporary vs permanent action duration handling
 * 4. Appeal deadline configuration
 * 5. Automatic escalation level assignment
 * 6. Complete response structure validation
 */
export async function test_api_moderation_action_creation_by_admin(
  connection: api.IConnection,
) {
  // Define available options for testing different combinations
  const targetTypes = [
    "post",
    "comment",
    "user",
    "community",
    "message",
  ] as const;
  const actionTypes = [
    "content_removal",
    "user_warning",
    "temporary_ban",
    "permanent_ban",
    "post_lock",
    "comment_removal",
  ] as const;
  const severityLevels = ["low", "medium", "high", "critical"] as const;

  // Test multiple combinations of moderation actions
  const testCases = ArrayUtil.repeat(5, (index) => {
    const targetType = RandomGenerator.pick(targetTypes);
    const actionType = RandomGenerator.pick(actionTypes);
    const severityLevel = RandomGenerator.pick(severityLevels);

    // Determine if this should be a temporary action
    const isTemporary =
      actionType === "temporary_ban" ||
      RandomGenerator.pick([true, false] as const);

    return {
      targetType,
      actionType,
      severityLevel,
      isTemporary,
      durationHours: isTemporary
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
          >()
        : undefined,
      appealDeadline: RandomGenerator.pick([true, false] as const)
        ? new Date(Date.now() + 86400000 * 7).toISOString()
        : undefined,
      escalationLevel: RandomGenerator.pick([true, false] as const)
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >()
        : undefined,
    };
  });

  // Execute each test case
  for (const testCase of testCases) {
    const requestBody = {
      action_type: testCase.actionType,
      target_type: testCase.targetType,
      target_id: typia.random<string & tags.Format<"uuid">>(),
      reason: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 12,
      }),
      severity_level: testCase.severityLevel,
      duration_hours: testCase.durationHours,
      appeal_deadline: testCase.appealDeadline,
      escalation_level: testCase.escalationLevel,
    } satisfies ICommunityPlatformModerationAction.ICreate;

    // Create the moderation action
    const moderationAction: ICommunityPlatformModerationAction =
      await api.functional.communityPlatform.admin.moderationActions.create(
        connection,
        { body: requestBody },
      );

    // Validate the response structure
    typia.assert(moderationAction);

    // Verify all required fields are present and correct
    TestValidator.equals(
      "action type matches request",
      moderationAction.action_type,
      requestBody.action_type,
    );
    TestValidator.equals(
      "target type matches request",
      moderationAction.target_type,
      requestBody.target_type,
    );
    TestValidator.equals(
      "reason matches request",
      moderationAction.reason,
      requestBody.reason,
    );
    TestValidator.equals(
      "severity level matches request",
      moderationAction.severity_level,
      requestBody.severity_level,
    );

    // Validate target entity summary
    typia.assert(moderationAction.target);
    TestValidator.equals(
      "target ID matches request",
      moderationAction.target.id,
      requestBody.target_id,
    );
    TestValidator.predicate(
      "target name is populated",
      moderationAction.target.name.length > 0,
    );
    TestValidator.predicate(
      "target status is populated",
      moderationAction.target.status.length > 0,
    );
    TestValidator.predicate(
      "target created_at is valid date",
      new Date(moderationAction.target.created_at).getTime() > 0,
    );

    // Validate duration handling
    if (requestBody.duration_hours) {
      TestValidator.equals(
        "duration hours matches request",
        moderationAction.duration_hours,
        requestBody.duration_hours,
      );
      TestValidator.predicate(
        "expires_at is set for temporary actions",
        moderationAction.expires_at !== undefined,
      );
    } else {
      TestValidator.equals(
        "duration hours is undefined for permanent actions",
        moderationAction.duration_hours,
        undefined,
      );
      TestValidator.equals(
        "expires_at is undefined for permanent actions",
        moderationAction.expires_at,
        undefined,
      );
    }

    // Validate appeal deadline
    if (requestBody.appeal_deadline) {
      TestValidator.equals(
        "appeal deadline matches request",
        moderationAction.appeal_deadline,
        requestBody.appeal_deadline,
      );
    } else {
      TestValidator.equals(
        "appeal deadline is undefined when not set",
        moderationAction.appeal_deadline,
        undefined,
      );
    }

    // Validate escalation level
    const expectedEscalationLevel = requestBody.escalation_level ?? 1;
    TestValidator.equals(
      "escalation level is properly assigned",
      moderationAction.escalation_level,
      expectedEscalationLevel,
    );

    // Validate status assignment
    TestValidator.predicate(
      "status is properly assigned",
      [
        "pending",
        "active",
        "completed",
        "appealed",
        "overturned",
        "expired",
      ].includes(moderationAction.status),
    );

    // Validate timestamp generation
    TestValidator.predicate(
      "created_at is valid timestamp",
      new Date(moderationAction.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "updated_at is valid timestamp",
      new Date(moderationAction.updated_at).getTime() > 0,
    );
    TestValidator.predicate(
      "created_at and updated_at are initially equal",
      moderationAction.created_at === moderationAction.updated_at,
    );

    // Validate ID generation
    TestValidator.predicate(
      "ID is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        moderationAction.id,
      ),
    );

    // Ensure soft deletion field is initially undefined
    TestValidator.equals(
      "deleted_at is undefined for new actions",
      moderationAction.deleted_at,
      undefined,
    );
  }

  // Test edge case: minimal required fields only
  const minimalRequestBody = {
    action_type: "content_removal",
    target_type: "post",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "Violation of community guidelines",
    severity_level: "medium",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const minimalAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.admin.moderationActions.create(
      connection,
      { body: minimalRequestBody },
    );

  typia.assert(minimalAction);
  TestValidator.equals(
    "minimal action type matches",
    minimalAction.action_type,
    minimalRequestBody.action_type,
  );
  TestValidator.equals(
    "minimal target type matches",
    minimalAction.target_type,
    minimalRequestBody.target_type,
  );
  TestValidator.equals(
    "minimal escalation level defaults to 1",
    minimalAction.escalation_level,
    1,
  );
  TestValidator.equals(
    "minimal duration hours is undefined",
    minimalAction.duration_hours,
    undefined,
  );
  TestValidator.equals(
    "minimal appeal deadline is undefined",
    minimalAction.appeal_deadline,
    undefined,
  );

  // Test error scenario: invalid target type
  await TestValidator.error("should reject invalid target type", async () => {
    await api.functional.communityPlatform.admin.moderationActions.create(
      connection,
      {
        body: {
          action_type: "content_removal",
          target_type: "invalid_type",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Test reason",
          severity_level: "medium",
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  });
}
