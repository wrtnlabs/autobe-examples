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
 * Test the moderation decision creation validation for the reason field.
 *
 * The reason must provide a clear explanation of the moderator's rationale.
 * Test scenarios include: (1) decision with reason of exactly 10 characters
 * (minimum) succeeds, (2) decision with reason of 11 characters succeeds, (3)
 * decision with very long reason (1000+ characters) is accepted, (4) reason
 * text is properly stored and retrievable in decision details, (5) different
 * action types work with valid reasons.
 *
 * This ensures transparency in moderation decisions and provides proper context
 * for appeals and audit trails.
 *
 * Steps:
 *
 * 1. Create a moderator account for decision submission
 * 2. Create a member account for potential appeal context
 * 3. Test decision creation with exactly 10-character reason (minimum valid)
 * 4. Test decision creation with 11-character reason (valid)
 * 5. Test decision creation with very long reason (1000+ characters - valid)
 * 6. Test decision with suspension action and valid reason
 * 7. Test decision with internal notes and valid reason
 * 8. Verify reason is stored and retrievable in decision details
 */
export async function test_api_report_decision_reason_validation(
  connection: api.IConnection,
) {
  // 1. Create a moderator account for decision submission
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a member account for potential appeal context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Test decision creation with exactly 10-character reason (minimum valid)
  const reason10chars = "0123456789";
  TestValidator.predicate(
    "reason has exactly 10 characters",
    () => reason10chars.length === 10,
  );

  const decision10: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "no_action",
          reason: reason10chars,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision10);
  TestValidator.equals(
    "decision reason matches 10-character input",
    decision10.reason,
    reason10chars,
  );

  // 4. Test decision creation with 11-character reason (valid)
  const reason11chars = "01234567890";
  TestValidator.predicate(
    "reason has exactly 11 characters",
    () => reason11chars.length === 11,
  );

  const decision11: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "remove_content",
          reason: reason11chars,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision11);
  TestValidator.equals(
    "decision reason matches 11-character input",
    decision11.reason,
    reason11chars,
  );

  // 5. Test decision creation with very long reason (1000+ characters - valid)
  const longReason = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 20,
    sentenceMax: 30,
    wordMin: 4,
    wordMax: 8,
  });
  TestValidator.predicate(
    "long reason has more than 1000 characters",
    () => longReason.length > 1000,
  );

  const decisionLong: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "escalate",
          reason: longReason,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionLong);
  TestValidator.equals(
    "decision reason matches long input",
    decisionLong.reason,
    longReason,
  );

  // 6. Test decision with suspension action and valid reason
  const suspensionReason =
    "User violated harassment policy on multiple occasions. This suspension allows time for reflection.";
  TestValidator.predicate(
    "suspension reason meets minimum length",
    () => suspensionReason.length >= 10,
  );

  const decisionSuspend: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "suspend_user",
          reason: suspensionReason,
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionSuspend);
  TestValidator.equals(
    "suspension decision reason is stored correctly",
    decisionSuspend.reason,
    suspensionReason,
  );

  // 7. Test decision with internal notes and valid reason
  const decisionReason =
    "Content violates community guidelines regarding misinformation and hate speech.";
  const internalNotes =
    "Third violation by this user. Pattern detected in past 30 days. Consider escalation if behavior continues.";
  TestValidator.predicate(
    "decision reason meets minimum length",
    () => decisionReason.length >= 10,
  );

  const decisionWithNotes: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          action_type: "ban_user",
          reason: decisionReason,
          internal_notes: internalNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decisionWithNotes);
  TestValidator.equals(
    "decision reason with notes is stored correctly",
    decisionWithNotes.reason,
    decisionReason,
  );

  // 8. Verify reason is stored and retrievable in decision details
  TestValidator.predicate(
    "decision reason is not empty",
    () => decisionWithNotes.reason.length > 0,
  );
  TestValidator.predicate(
    "decision reason meets minimum length requirement",
    () => decisionWithNotes.reason.length >= 10,
  );
  TestValidator.predicate(
    "moderator information is stored in decision",
    () => decisionWithNotes.moderator.id.length > 0,
  );
}
