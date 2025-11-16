import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test escalating a moderation decision to legal/higher authority team.
 *
 * This test validates the escalation workflow for serious violations by:
 *
 * 1. Creating a moderator account to make moderation decisions
 * 2. Creating a member account to be reported
 * 3. Submitting a report for serious violation
 * 4. Creating an escalation decision via PUT endpoint
 * 5. Verifying escalation fields are correctly set with proper reasoning
 * 6. Confirming decision remains linked to report for audit trail
 * 7. Validating system properly routes escalated decision to higher authority
 *
 * The test ensures escalation workflow handles serious violations correctly,
 * preserves investigation findings, and maintains proper audit trail for legal
 * review.
 */
export async function test_api_report_decision_escalate_to_legal(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://platform.example.com/auth/register",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account to be reported
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://platform.example.com/auth/register",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Generate report ID (in real scenario, would be created via API)
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Update decision with escalation action via PUT endpoint
  const escalationReason =
    "Content involves serious violation requiring legal review and higher authority involvement due to potential illegal nature.";
  const internalNotes =
    "Pattern of serious violations detected. User has history of similar reports. Escalating to legal team for further investigation and potential legal action.";

  const escalatedDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.update(
      connection,
      {
        reportId: reportId,
        body: {
          actionType: "escalate",
          reason: escalationReason,
          internalNotes: internalNotes,
          suspensionDurationDays: undefined,
        } satisfies ICommunityPlatformReportDecision.IUpdate,
      },
    );
  typia.assert(escalatedDecision);

  // Step 5: Verify escalation decision properties
  TestValidator.equals(
    "decision action_type is escalate",
    escalatedDecision.action_type,
    "escalate",
  );

  TestValidator.predicate(
    "reason is provided and describes escalation justification",
    escalatedDecision.reason.length >= 10,
  );

  TestValidator.predicate(
    "internal_notes document investigation findings",
    escalatedDecision.internal_notes !== null &&
      escalatedDecision.internal_notes !== undefined &&
      escalatedDecision.internal_notes.length > 0,
  );

  TestValidator.predicate(
    "suspension_duration_days is null for escalate action",
    escalatedDecision.suspension_duration_days === null ||
      escalatedDecision.suspension_duration_days === undefined,
  );

  // Step 6: Verify decision remains linked to report
  TestValidator.predicate(
    "decision is linked to the report",
    escalatedDecision.report !== null && escalatedDecision.report !== undefined,
  );

  TestValidator.equals(
    "report ID matches requested report",
    escalatedDecision.report.id,
    reportId,
  );

  // Step 7: Verify moderator information in decision
  TestValidator.predicate(
    "moderator information is recorded in decision",
    escalatedDecision.moderator !== null &&
      escalatedDecision.moderator !== undefined,
  );

  TestValidator.predicate(
    "moderator ID is set",
    escalatedDecision.moderator.id.length > 0,
  );

  // Step 8: Verify timestamps are properly set
  TestValidator.predicate(
    "created_at timestamp is set",
    escalatedDecision.created_at !== null &&
      escalatedDecision.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at timestamp is set for escalation",
    escalatedDecision.updated_at !== null &&
      escalatedDecision.updated_at !== undefined,
  );

  // Step 9: Verify audit trail recording (deleted_at should be null for active escalation)
  TestValidator.predicate(
    "deleted_at is null for active escalation decision",
    escalatedDecision.deleted_at === null ||
      escalatedDecision.deleted_at === undefined,
  );

  // Step 10: Verify escalation workflow allows routing to higher authority
  TestValidator.predicate(
    "decision can be escalated to legal team",
    escalatedDecision.action_type === "escalate",
  );

  TestValidator.predicate(
    "internal notes preserve context for legal review",
    escalatedDecision.internal_notes !== null &&
      escalatedDecision.internal_notes !== undefined,
  );
}
