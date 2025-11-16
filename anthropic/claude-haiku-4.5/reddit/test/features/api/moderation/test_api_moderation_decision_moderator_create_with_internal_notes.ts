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
 * Validates moderator creation of report decisions with internal notes.
 *
 * This test verifies that moderators can create moderation decisions on content
 * violation reports and include internal notes that are visible only to
 * moderators and administrators. Internal notes provide space for investigation
 * findings, pattern detection (e.g., repeat offender tracking), and complex
 * reasoning that helps other moderators understand context in future reviews.
 *
 * The test workflow:
 *
 * 1. Register a member account (to establish community context)
 * 2. Register a moderator account with necessary permissions
 * 3. Create moderation decisions with internal notes documenting investigation
 *    findings
 * 4. Verify decisions include properly stored internal notes for audit trail
 * 5. Validate that different action types support internal note documentation
 */
export async function test_api_moderation_decision_moderator_create_with_internal_notes(
  connection: api.IConnection,
) {
  // 1. Register a member account to establish community context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TempPassword123!",
        ip: "192.168.1.1",
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "ModeratorPass123!",
        ip: "192.168.1.2",
        href: "https://community.example.com/moderator/join",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Create moderation decision with suspension and comprehensive internal notes
  const suspensionReportId = typia.random<string & tags.Format<"uuid">>();
  const suspensionReason =
    "Content violates community harassment policy by including personal attacks and explicit threats toward other members.";
  const suspensionInternalNotes = `Investigation findings: User is a repeat offender with three violations in the past 30 days. Previous violations documented on 2024-01-05, 2024-01-12, 2024-01-18. Pattern indicates escalating aggression and targeted harassment. Cross-reference with similar cases shows coordinated harassment campaign. Recommend escalation to permanent ban if next violation occurs within 90 days. Moderator consensus: 3 out of 3 reviewers concurred this warrants suspension.`;

  const suspensionDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: suspensionReportId,
        body: {
          action_type: "suspend_user",
          reason: suspensionReason,
          internal_notes: suspensionInternalNotes,
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(suspensionDecision);

  // Verify suspension decision with internal notes
  TestValidator.equals(
    "suspension decision action type is suspend_user",
    suspensionDecision.action_type,
    "suspend_user",
  );

  TestValidator.equals(
    "suspension decision reason matches input",
    suspensionDecision.reason,
    suspensionReason,
  );

  TestValidator.equals(
    "suspension internal notes are stored and accessible",
    suspensionDecision.internal_notes,
    suspensionInternalNotes,
  );

  TestValidator.equals(
    "suspension duration is correctly set to 7 days",
    suspensionDecision.suspension_duration_days,
    7,
  );

  TestValidator.predicate(
    "moderator identity is recorded in decision",
    suspensionDecision.moderator !== null &&
      suspensionDecision.moderator !== undefined &&
      suspensionDecision.moderator.id !== null,
  );

  TestValidator.predicate(
    "report reference is linked to decision",
    suspensionDecision.report !== null &&
      suspensionDecision.report !== undefined,
  );

  TestValidator.predicate(
    "decision timestamps exist for audit trail",
    suspensionDecision.created_at !== null &&
      suspensionDecision.created_at !== undefined &&
      suspensionDecision.updated_at !== null &&
      suspensionDecision.updated_at !== undefined,
  );

  // 4. Create moderation decision with no action (content approved) with internal notes
  const approvalReportId = typia.random<string & tags.Format<"uuid">>();
  const approvalReason =
    "Content does not violate community standards. User was expressing legitimate political opinion within acceptable bounds of discourse.";
  const approvalInternalNotes =
    "Reviewed by two moderators independently. Consensus: this is legitimate political debate, not harassment. Report appears to be from user with history of frivolous reports. No action warranted.";

  const approvalDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: approvalReportId,
        body: {
          action_type: "no_action",
          reason: approvalReason,
          internal_notes: approvalInternalNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(approvalDecision);

  // Verify approval decision with internal notes for transparency
  TestValidator.equals(
    "approval decision action type is no_action",
    approvalDecision.action_type,
    "no_action",
  );

  TestValidator.equals(
    "approval decision reason is recorded",
    approvalDecision.reason,
    approvalReason,
  );

  TestValidator.equals(
    "approval internal notes document moderation reasoning",
    approvalDecision.internal_notes,
    approvalInternalNotes,
  );

  TestValidator.predicate(
    "no_action decision does not have suspension duration",
    approvalDecision.suspension_duration_days === null ||
      approvalDecision.suspension_duration_days === undefined,
  );

  // 5. Create decision with warning and internal context notes
  const warningReportId = typia.random<string & tags.Format<"uuid">>();
  const warningReason =
    "User violated community rules regarding off-topic content placement. Formal warning issued.";
  const warningInternalNotes =
    "First-time violation by new user. User may be unfamiliar with community guidelines. Recommend friendly guidance and resource sharing about community rules. Monitor for repeat violations.";

  const warningDecision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: warningReportId,
        body: {
          action_type: "issue_warning",
          reason: warningReason,
          internal_notes: warningInternalNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(warningDecision);

  // Verify warning decision documents educational approach
  TestValidator.equals(
    "warning decision action type is issue_warning",
    warningDecision.action_type,
    "issue_warning",
  );

  TestValidator.predicate(
    "warning internal notes provide context for moderator follow-up",
    warningDecision.internal_notes !== null &&
      warningDecision.internal_notes !== undefined &&
      warningDecision.internal_notes.length > 0,
  );
}
