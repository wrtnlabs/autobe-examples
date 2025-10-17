import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";

/**
 * Test scenario: Admin retrieves a paginated and filtered list of content
 * reports for moderation.
 *
 * This test performs the full administrative workflow including authentication,
 * setup of report status categories, creation of report entries on various
 * content targets (posts, comments, members), and finally retrieval of a
 * paginated report list through admin-specific endpoints.
 *
 * Steps:
 *
 * 1. Admin registers via /auth/admin/join and authenticates.
 * 2. Multiple report statuses are created (e.g., pending, reviewed).
 * 3. Content reports are created referencing different posts, comments, and
 *    members, linked to the report statuses.
 * 4. Admin requests the reports index with pagination and filtering.
 * 5. The returned data's pagination and content correctness are validated.
 * 6. Access control is implicitly tested as admin login occurs before sensitive
 *    calls.
 */
export async function test_api_report_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin - join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create report statuses
  const statusNames = ["pending", "reviewed", "action taken"] as const;

  const reportStatuses: IRedditCommunityReportStatus[] = [];

  for (const name of statusNames) {
    const status: IRedditCommunityReportStatus =
      await api.functional.redditCommunity.admin.reportStatuses.create(
        connection,
        {
          body: {
            name,
            description: `Status for reports that are ${name}`,
          } satisfies IRedditCommunityReportStatus.ICreate,
        },
      );
    typia.assert(status);
    reportStatuses.push(status);
  }

  // Helper function for unique UUID
  function randomUUID(): string & tags.Format<"uuid"> {
    return typia.random<string & tags.Format<"uuid">>();
  }

  // 3. Create multiple content reports referencing posts, comments, and members
  const reportsCount = 10;
  const reports: IRedditCommunityReport[] = [];

  for (let i = 0; i < reportsCount; i++) {
    // Randomly choose type of reporter and reported entities
    // reporter: choose member with 80% chance, guest 20%
    const isMemberReporter = Math.random() < 0.8;

    // choose random status
    const status = RandomGenerator.pick(reportStatuses);

    // Content target type
    const targetTypes = ["post", "comment", "member"] as const;
    const targetType = RandomGenerator.pick(targetTypes);

    // Prepare report body with correct properties
    const reportBody: IRedditCommunityReport.ICreate = {
      status_id: status.id,
      category: RandomGenerator.pick(["spam", "abuse", "other"] as const),
      description: RandomGenerator.paragraph({ sentences: 3 }),
    };

    if (isMemberReporter) {
      reportBody.reporter_member_id = randomUUID();
    } else {
      reportBody.reporter_guest_id = randomUUID();
    }

    // Set reported target
    switch (targetType) {
      case "post":
        reportBody.reported_post_id = randomUUID();
        break;
      case "comment":
        reportBody.reported_comment_id = randomUUID();
        break;
      case "member":
        reportBody.reported_member_id = randomUUID();
        break;
    }

    // Create report
    const report: IRedditCommunityReport =
      await api.functional.redditCommunity.reports.create(connection, {
        body: reportBody,
      });
    typia.assert(report);
    reports.push(report);
  }

  // 4. Use admin role to retrieve paginated list of reports
  // Choose pagination values (page 1, limit up to reportsCount)
  const requestBody: IRedditCommunityReport.IRequest = {
    page: 1,
    limit: reportsCount,
    order: "asc",
    sort_by: "created_at",
  };

  // 5. Call the index endpoint
  const pageResult: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.admin.reports.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  // 6. Validate pagination
  TestValidator.predicate(
    "result.page is 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "result.limit equals requested limit",
    pageResult.pagination.limit === reportsCount,
  );
  TestValidator.predicate(
    "records count less or equal limit",
    pageResult.data.length <= reportsCount,
  );

  // 7. Check that each returned report is present in the created reports
  for (const report of pageResult.data) {
    TestValidator.predicate(
      "report.id is among created reports",
      reports.some((r) => r.id === report.id),
    );
  }
}
