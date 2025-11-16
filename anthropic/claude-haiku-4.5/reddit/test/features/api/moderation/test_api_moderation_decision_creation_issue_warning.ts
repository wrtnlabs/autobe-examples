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

export async function test_api_moderation_decision_creation_issue_warning(
  connection: api.IConnection,
) {
  // 1. Create a member account (the user to be warned)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = RandomGenerator.alphabets(10);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000/",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphabets(10);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000/",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 3. Create a report for a rule violation by the member
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_member_id: member.id,
        category: "harassment",
        additional_details: "User has been engaging in harassing behavior",
        reporter_contact_email: typia.random<string & tags.Format<"email">>(),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report created with submitted status",
    report.status,
    "submitted",
  );

  // 4. Switch to moderator account for decision creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000/",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 5. Create a moderation decision with action_type 'issue_warning'
  const reason =
    "User violated community harassment policy. First offense, formal warning issued.";
  const internalNotes = "Monitor user for repeat violations in next 30 days";

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason: reason,
          internal_notes: internalNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 6. Verify the decision response includes all required fields
  TestValidator.equals(
    "decision action type is issue_warning",
    decision.action_type,
    "issue_warning",
  );
  TestValidator.equals(
    "decision reason matches input",
    decision.reason,
    reason,
  );
  TestValidator.equals(
    "decision internal notes match input",
    decision.internal_notes,
    internalNotes,
  );
  TestValidator.predicate(
    "decision has valid moderator identity",
    decision.moderator !== null &&
      decision.moderator !== undefined &&
      decision.moderator.id.length > 0,
  );
  TestValidator.predicate(
    "decision references correct report",
    decision.report !== null &&
      decision.report !== undefined &&
      decision.report.id === report.id,
  );
  TestValidator.predicate(
    "decision reason meets minimum length requirement",
    decision.reason.length >= 10,
  );

  // 7. Verify timestamps are valid date-time format
  TestValidator.predicate(
    "decision has valid created_at timestamp",
    new Date(decision.created_at) instanceof Date &&
      !isNaN(new Date(decision.created_at).getTime()),
  );
  TestValidator.predicate(
    "decision has valid updated_at timestamp",
    new Date(decision.updated_at) instanceof Date &&
      !isNaN(new Date(decision.updated_at).getTime()),
  );
}
