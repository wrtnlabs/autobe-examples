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

export async function test_api_moderation_decision_creation_with_internal_notes(
  connection: api.IConnection,
) {
  // 1. Create moderator account for making decisions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "ModeratorPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member account (reporter)
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        username: RandomGenerator.name(1),
        password: "ReporterPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reporter);

  // 3. Create another member account to be reported
  const reportedMemberEmail = typia.random<string & tags.Format<"email">>();
  const reportedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reportedMemberEmail,
        username: RandomGenerator.name(1),
        password: "ReportedMemberPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reportedMember);

  // 4. Switch to reporter context and submit a report on the member for harassment
  await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: "ReporterPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_member_id: reportedMember.id,
        category: "harassment",
        additional_details:
          "Member has been sending threatening messages and harassing other community members",
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 5. Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 6. Create moderation decision with internal notes visible only to moderators
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason:
            "Your account has been flagged for violating our community harassment policy. We take community safety seriously and expect all members to treat others with respect. This is your first official warning.",
          internal_notes:
            "Third violation report by this member in 30 days. Pattern detected: escalating harassment behavior targeting new members. Cross-moderator note: Sarah reviewed similar reports from yesterday - coordinating escalation strategy. Related reports: REP-2024-001, REP-2024-005. Recommend account suspension if next violation occurs within 14 days.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 7. Validate decision structure and that internal notes are properly stored
  TestValidator.equals(
    "decision action type should be issue_warning",
    decision.action_type,
    "issue_warning",
  );

  TestValidator.predicate(
    "decision reason should be substantial and visible to users",
    decision.reason.length > 10,
  );

  TestValidator.predicate(
    "internal notes should be present for moderator coordination only",
    decision.internal_notes !== undefined && decision.internal_notes !== null,
  );

  TestValidator.predicate(
    "internal notes should contain pattern detection for repeat violations",
    decision.internal_notes?.includes("Third violation") === true,
  );

  TestValidator.predicate(
    "internal notes should contain cross-moderator coordination information",
    decision.internal_notes?.includes("Cross-moderator note") === true,
  );

  TestValidator.predicate(
    "internal notes should include investigation context",
    decision.internal_notes?.includes("Pattern detected") === true,
  );

  TestValidator.predicate(
    "internal notes should reference related cases for audit trail",
    decision.internal_notes?.includes("Related reports") === true,
  );

  TestValidator.predicate(
    "decision should have moderator identity for accountability",
    decision.moderator !== undefined && decision.moderator !== null,
  );

  TestValidator.predicate(
    "decision should link to original report",
    decision.report !== undefined && decision.report !== null,
  );

  TestValidator.equals(
    "report ID in decision should match original report",
    decision.report.id,
    report.id,
  );

  TestValidator.predicate(
    "reason and internal notes should be distinct",
    decision.reason !== decision.internal_notes,
  );
}
