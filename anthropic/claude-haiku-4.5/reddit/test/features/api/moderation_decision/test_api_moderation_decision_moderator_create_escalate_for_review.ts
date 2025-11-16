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

export async function test_api_moderation_decision_moderator_create_escalate_for_review(
  connection: api.IConnection,
) {
  // 1. Register a member (the person whose content may be involved in the escalated case)
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Register a moderator (who will make the escalation decision)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Create a moderation decision with escalate action
  // Using a valid UUID format for the report ID
  const reportId: string = typia.random<string & tags.Format<"uuid">>();

  const decisionReason =
    "This case involves potential legal violations and requires senior legal team review. The complexity and severity of the reported content exceed standard moderator authority and require escalation.";
  const internalNotes =
    "Pattern detected: third violation by user in 30 days. Cross-community coordination needed. Recommend legal consultation before final action.";

  // Attempt to create escalation decision
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "escalate",
          reason: decisionReason,
          internal_notes: internalNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 4. Validate the escalation decision structure and content
  TestValidator.equals(
    "decision action_type is escalate",
    decision.action_type,
    "escalate",
  );

  TestValidator.predicate(
    "decision reason meets minimum length requirement",
    decision.reason.length >= 10,
  );

  TestValidator.equals(
    "decision reason matches provided input",
    decision.reason,
    decisionReason,
  );

  TestValidator.equals(
    "decision internal notes match provided input",
    decision.internal_notes,
    internalNotes,
  );

  // 5. Validate escalation pathway properties
  TestValidator.predicate(
    "decision has moderator information for accountability",
    decision.moderator.id !== null && decision.moderator.id !== undefined,
  );

  TestValidator.predicate(
    "moderator username is recorded for audit trail",
    decision.moderator.username.length > 0,
  );

  TestValidator.predicate(
    "decision has report information linking to original case",
    decision.report.id !== null && decision.report.id !== undefined,
  );

  TestValidator.predicate(
    "decision created_at timestamp is properly recorded",
    decision.created_at !== null && decision.created_at !== undefined,
  );

  // 6. Validate that escalate action does not include suspension duration
  TestValidator.predicate(
    "escalate action does not include suspension duration",
    decision.suspension_duration_days === null ||
      decision.suspension_duration_days === undefined,
  );

  // 7. Validate the escalation is properly marked for higher authority
  TestValidator.predicate(
    "decision action type indicates escalation for senior review",
    decision.action_type === "escalate",
  );
}
