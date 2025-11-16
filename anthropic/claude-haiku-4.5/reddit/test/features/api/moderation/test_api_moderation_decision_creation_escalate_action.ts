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
 * Test creating a moderation decision with action_type='escalate' to refer
 * complex cases to higher authority.
 *
 * This test validates the escalation workflow where moderators escalate complex
 * violation cases to legal teams or senior management for additional review.
 * The test verifies that escalation decisions properly document the reason for
 * escalation and maintain investigation context through internal notes.
 *
 * Workflow:
 *
 * 1. Create moderator account with authentication
 * 2. Submit an escalation decision with action_type='escalate' on a report
 * 3. Verify the decision is created with all required escalation details
 * 4. Verify the decision includes moderator information and report context
 * 5. Validate that escalated decisions properly document investigation context
 */
export async function test_api_moderation_decision_creation_escalate_action(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });

  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== null,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Create an escalation decision for a sample report
  // Use a realistic report ID that would be obtained from creating/retrieving a report
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create the escalation decision with action_type='escalate'
  const escalationReason =
    "This case involves potential legal implications requiring senior legal team review. " +
    "Multiple policy violations detected with international jurisdiction concerns.";

  const internalNotes =
    "Cross-border content violation detected. User has pattern of similar infractions. " +
    "Recommend escalation to legal department for cease and desist considerations.";

  const escalationDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "escalate",
          reason: escalationReason,
          internal_notes: internalNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );

  typia.assert(escalationDecision);

  // Step 4: Verify escalation decision structure and content
  TestValidator.equals(
    "decision action type is escalate",
    escalationDecision.action_type,
    "escalate",
  );

  TestValidator.predicate(
    "decision has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      escalationDecision.id,
    ),
  );

  TestValidator.predicate(
    "reason explains escalation necessity",
    escalationDecision.reason.length >= 10,
  );

  TestValidator.equals(
    "internal notes are preserved",
    escalationDecision.internal_notes,
    internalNotes,
  );

  // Step 5: Verify moderator attribution
  TestValidator.predicate(
    "moderator information is included",
    escalationDecision.moderator !== null &&
      escalationDecision.moderator !== undefined,
  );

  TestValidator.equals(
    "decision moderator matches authenticated moderator",
    escalationDecision.moderator.id,
    moderator.id,
  );

  // Step 6: Verify report association
  TestValidator.predicate(
    "report information is included in decision",
    escalationDecision.report !== null &&
      escalationDecision.report !== undefined,
  );

  TestValidator.equals(
    "report ID matches requested report",
    escalationDecision.report.id,
    reportId,
  );

  // Step 7: Verify timestamps are properly set
  TestValidator.predicate(
    "created_at timestamp is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(escalationDecision.created_at),
  );

  TestValidator.predicate(
    "updated_at timestamp is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(escalationDecision.updated_at),
  );

  // Step 8: Verify escalation decision doesn't have suspension duration
  // (suspension_duration_days should only apply to suspend_user action)
  TestValidator.predicate(
    "suspension duration not set for escalate action",
    escalationDecision.suspension_duration_days === null ||
      escalationDecision.suspension_duration_days === undefined,
  );
}
