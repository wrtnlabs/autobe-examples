import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";

/**
 * Test administrator suspension creation workflow.
 *
 * Validates that administrators can create account suspensions through the
 * administrative suspension endpoint. This test demonstrates the
 * administrator's ability to issue temporary account restrictions for guideline
 * violations, with proper moderation action documentation and comprehensive
 * suspension reasoning for transparency and appeal support.
 *
 * Workflow:
 *
 * 1. Create administrator account through registration to obtain authentication
 * 2. Create moderation action documenting the violation investigation and decision
 * 3. Create suspension with maximum allowed duration (30 days)
 * 4. Validate suspension details including duration, active status, and proper
 *    field population
 */
export async function test_api_suspension_creation_by_administrator_with_extended_duration(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);
  typia.assert(admin.token);

  // Step 2: Create moderation action as prerequisite for suspension
  const targetMemberId = typia.random<string & tags.Format<"uuid">>();

  const moderationActionData = {
    administrator_id: admin.id,
    target_member_id: targetMemberId,
    action_type: "suspend_user" as const,
    reason:
      "Repeated severe violations of community guidelines including hate speech and personal attacks. Member has received multiple warnings and continues to engage in disruptive behavior that violates platform policies. Suspension necessary to protect community safety and provide time for reflection on community standards.",
    violation_category: "hate_speech" as const,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Create suspension with maximum allowed duration (30 days)
  const suspensionDuration = 30;

  const suspensionData = {
    member_id: targetMemberId,
    suspension_reason:
      "This suspension is issued for repeated severe violations of community guidelines. The member has engaged in hate speech, personal attacks, and harassment despite receiving multiple formal warnings. The 30-day suspension period is necessary given the severity and frequency of violations, providing time for the member to reflect on community standards while protecting other users from further harmful behavior. This action follows the graduated enforcement approach and includes full transparency with detailed reasoning to support the appeals process.",
    duration_days: suspensionDuration,
  } satisfies IDiscussionBoardSuspension.ICreate;

  const suspension: IDiscussionBoardSuspension =
    await api.functional.discussionBoard.administrator.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  // Step 4: Validate suspension was created with correct details
  TestValidator.equals(
    "suspension member matches target",
    suspension.member_id,
    targetMemberId,
  );

  TestValidator.equals(
    "suspension duration is 30 days",
    suspension.duration_days,
    suspensionDuration,
  );

  TestValidator.equals("suspension is active", suspension.is_active, true);

  TestValidator.equals(
    "administrator ID is recorded",
    suspension.administrator_id,
    admin.id,
  );

  TestValidator.predicate(
    "moderator ID is not set for administrator suspension",
    suspension.moderator_id === undefined,
  );

  TestValidator.equals(
    "suspension reason is detailed and comprehensive",
    suspension.suspension_reason,
    suspensionData.suspension_reason,
  );

  TestValidator.equals(
    "suspension not lifted early",
    suspension.lifted_early,
    false,
  );

  // Validate date calculations for suspension period
  const startDate = new Date(suspension.start_date);
  const endDate = new Date(suspension.end_date);
  const calculatedDuration = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  TestValidator.equals(
    "end date correctly calculated for 30-day suspension",
    calculatedDuration,
    suspensionDuration,
  );

  TestValidator.predicate(
    "end date is in the future",
    endDate.getTime() > Date.now(),
  );
}
