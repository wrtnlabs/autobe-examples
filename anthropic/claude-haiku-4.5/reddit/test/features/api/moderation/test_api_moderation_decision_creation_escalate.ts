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
 * Test successful creation of a moderation decision with action_type
 * 'escalate'.
 *
 * This scenario validates that a moderator can escalate a complex or sensitive
 * report to higher authority such as legal team or senior moderation team when
 * standard moderation action is insufficient. The test verifies that the
 * decision is recorded with required reason explaining why escalation was
 * necessary, optional internal notes provide context for escalation, and the
 * response includes the escalate action type.
 *
 * Complete workflow:
 *
 * 1. Create a member account for the reporter
 * 2. Create a report on a potential violation requiring escalation
 * 3. Create a moderator account for decision-making
 * 4. Authenticate as moderator
 * 5. Create an escalation decision with detailed reasoning
 * 6. Validate decision records the escalate action correctly
 */
export async function test_api_moderation_decision_creation_escalate(
  connection: api.IConnection,
) {
  // 1. Create a member account for the reporter
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a report requiring escalation
  const reportCategory = "illegal_content";
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        category: reportCategory,
        additional_details:
          "This content appears to violate laws and requires legal team review",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);
  TestValidator.equals(
    "report created with correct category",
    report.category,
    reportCategory,
  );

  // 3. Create a moderator account for decision-making
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass456!";

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 4. Authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 5. Create an escalation decision with detailed reasoning
  const escalationReason =
    "This content involves potential violation of laws regarding illegal activities. Case requires legal team review and jurisdiction-specific analysis before final action determination.";
  const internalNotes =
    "Third-party involvement suspected. Evidence forwarded to legal counsel for assessment.";

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "escalate",
          reason: escalationReason,
          internal_notes: internalNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 6. Validate decision records the escalate action correctly
  TestValidator.equals(
    "decision action_type is escalate",
    decision.action_type,
    "escalate",
  );
  TestValidator.equals(
    "decision reason matches input",
    decision.reason,
    escalationReason,
  );
  TestValidator.equals(
    "decision internal notes match input",
    decision.internal_notes,
    internalNotes,
  );
  TestValidator.predicate(
    "decision has valid moderator attribution",
    decision.moderator !== null && decision.moderator !== undefined,
  );
  TestValidator.predicate(
    "decision linked to correct report",
    decision.report.id === report.id,
  );
  TestValidator.predicate(
    "decision has creation timestamp",
    decision.created_at !== null && decision.created_at !== undefined,
  );
}
