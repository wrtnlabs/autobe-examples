import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test retrieval of a moderation report targeting a user account for user-level
 * violations.
 *
 * This test validates the complete workflow for user-level violation reports.
 * User-level reports focus on member account behavior patterns rather than
 * specific content violations. The test creates a member account to be
 * reported, establishes administrator credentials, and then retrieves a
 * user-level report to validate that all member summary information (username,
 * email verification status, karma score, account status) is properly captured
 * and accessible to moderators for assessment.
 *
 * The test ensures that the moderation system correctly:
 *
 * 1. Captures essential member identity and reputation metrics in user-level
 *    reports
 * 2. Distinguishes user-level reports (reported_member populated) from
 *    content-level reports (reported_post/reported_comment populated)
 * 3. Assigns appropriate priority for user-level violations
 * 4. Enables moderators to access comprehensive member context for enforcement
 *
 * Steps:
 *
 * 1. Create a member account (for context of user-level violations)
 * 2. Create an administrator account for report retrieval
 * 3. Retrieve a user-level report targeting a member
 * 4. Validate reported_member contains complete member summary
 * 5. Verify reported_post and reported_comment are null
 * 6. Confirm priority assignment and report structure
 */
export async function test_api_report_retrieval_with_user_target(
  connection: api.IConnection,
) {
  // Step 1: Create a member account (represents user-level violation context)
  const reportedMemberEmail = typia.random<string & tags.Format<"email">>();
  const reportedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reportedMemberEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(reportedMember);

  // Step 2: Create administrator account for report retrieval
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 3: Retrieve a user-level report targeting the member
  // Using a generated UUID for report retrieval
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.at(
      connection,
      {
        reportId: reportId,
      },
    );
  typia.assert(report);

  // Step 4: Validate report is a user-level violation report
  TestValidator.predicate(
    "report should have reported_member for user-level violation",
    report.reported_member !== null && report.reported_member !== undefined,
  );

  // Step 5: Validate reported_member contains complete summary information
  if (report.reported_member) {
    const reportedMemberSummary = report.reported_member;
    typia.assert(reportedMemberSummary);

    TestValidator.predicate(
      "reported member should have valid ID",
      reportedMemberSummary.id.length > 0,
    );

    TestValidator.predicate(
      "reported member should have username for identification",
      reportedMemberSummary.username !== null &&
        reportedMemberSummary.username !== undefined &&
        reportedMemberSummary.username.length > 0,
    );

    TestValidator.predicate(
      "reported member should have email for contact",
      reportedMemberSummary.email.length > 0,
    );

    TestValidator.predicate(
      "reported member should have email_verified status",
      typeof reportedMemberSummary.email_verified === "boolean",
    );

    TestValidator.predicate(
      "reported member should have account_status",
      ["active", "suspended", "pending_deletion", "deleted"].includes(
        reportedMemberSummary.account_status,
      ),
    );

    TestValidator.predicate(
      "reported member should have karma_score for reputation context",
      reportedMemberSummary.karma_score >= 0,
    );

    TestValidator.predicate(
      "reported member should have creation timestamp",
      reportedMemberSummary.created_at.length > 0,
    );
  }

  // Step 6: Verify reported_post and reported_comment are null
  TestValidator.predicate(
    "reported_post should be null for user-level report",
    report.reported_post === null || report.reported_post === undefined,
  );

  TestValidator.predicate(
    "reported_comment should be null for user-level report",
    report.reported_comment === null || report.reported_comment === undefined,
  );

  // Step 7: Validate report structure and priority for user-level violations
  TestValidator.predicate(
    "report should have category for violation classification",
    report.category.length > 0,
  );

  TestValidator.predicate(
    "report should have status in moderation workflow",
    [
      "submitted",
      "in_review",
      "pending_decision",
      "resolved",
      "dismissed",
    ].includes(report.status),
  );

  TestValidator.predicate(
    "report should have priority for user-level violations",
    ["critical", "high", "medium", "low"].includes(report.priority),
  );

  // Step 8: Validate reporter information is captured
  TestValidator.predicate(
    "report should have reporter information for accountability",
    report.reporter !== null && report.reporter !== undefined,
  );

  if (report.reporter) {
    typia.assert(report.reporter);
    TestValidator.predicate(
      "reporter should be identifiable for pattern detection",
      report.reporter.id.length > 0 && report.reporter.username.length > 0,
    );
  }

  // Step 9: Validate audit trail timestamps
  TestValidator.predicate(
    "report should have created_at for audit trail",
    report.created_at.length > 0,
  );

  TestValidator.predicate(
    "report should have updated_at for workflow tracking",
    report.updated_at.length > 0,
  );
}
