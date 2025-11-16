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

export async function test_api_report_decision_retrieval_with_suspension_details(
  connection: api.IConnection,
) {
  // Step 1: Create member account to be reported
  const reportedMemberEmail = typia.random<string & tags.Format<"email">>();
  const reportedMemberPassword = RandomGenerator.alphaNumeric(12);
  const reportedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: reportedMemberEmail,
      username: RandomGenerator.alphabets(10),
      password: reportedMemberPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reportedMember);

  // Step 2: Create reporter member account
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphaNumeric(12);
  const reporterMember = await api.functional.auth.member.join(connection, {
    body: {
      email: reporterEmail,
      username: RandomGenerator.alphabets(10),
      password: reporterPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(reporterMember);

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: moderatorPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Switch to reporter member to create report
  await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
      href: "https://example.com/report",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create report for the reported member
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_member_id: reportedMember.id,
        category: "harassment",
        additional_details: "Repeated harassment and threatening behavior",
        reporter_contact_email: reporterEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 6: Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderate",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Create suspension decision with specific duration
  const suspensionDuration = 7; // 7 days
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "suspend_user",
          reason: "User violated community harassment policy multiple times",
          internal_notes: "Third violation in 30 days - escalating suspension",
          suspension_duration_days: suspensionDuration,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 8: Retrieve decision using GET endpoint
  const retrievedDecision =
    await api.functional.communityPlatform.reports.decision.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedDecision);

  // Step 9: Validate suspension details
  TestValidator.equals(
    "decision action type should be suspend_user",
    retrievedDecision.action_type,
    "suspend_user",
  );

  TestValidator.equals(
    "suspension duration should match created decision",
    retrievedDecision.suspension_duration_days,
    suspensionDuration,
  );

  TestValidator.predicate(
    "suspension duration should be within valid range",
    (retrievedDecision.suspension_duration_days ?? 0) >= 1 &&
      (retrievedDecision.suspension_duration_days ?? 0) <= 365,
  );

  TestValidator.equals(
    "moderator id should match",
    retrievedDecision.moderator.id,
    moderator.id,
  );

  TestValidator.equals(
    "report id should match",
    retrievedDecision.report.id,
    report.id,
  );

  TestValidator.predicate(
    "reason should be provided",
    (retrievedDecision.reason?.length ?? 0) > 0,
  );

  TestValidator.predicate(
    "decision timestamp should be set",
    typeof retrievedDecision.created_at === "string" &&
      retrievedDecision.created_at.length > 0,
  );
}
