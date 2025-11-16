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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Test sorting reports by priority with critical priority reports appearing
 * first at the administrator level.
 *
 * This test validates the administrator-level moderation queue's ability to
 * sort and display content violation reports by priority level, ensuring that
 * the most critical and severe violations are surfaced at the top of the
 * platform-wide moderation dashboard.
 *
 * Test flow:
 *
 * 1. Administrator authenticates and receives JWT tokens
 * 2. Administrator retrieves reports sorted by priority (priority_desc)
 * 3. Verify that critical priority reports appear first in the list
 * 4. Validate pagination information is correct
 * 5. Confirm report ordering follows priority: critical > high > medium > low
 * 6. Validate report summary structure and data integrity
 */
export async function test_api_moderation_report_queue_administrator_sorting_priority_critical_first(
  connection: api.IConnection,
) {
  // 1. Administrator authenticates and receives initial JWT tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminHref = "http://localhost:3000/admin/login";

  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: adminHref,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "administrator authenticated successfully",
    adminAuth.id !== undefined,
  );

  // 2. Administrator retrieves reports sorted by priority (descending)
  // This should return critical priority reports first, followed by high, medium, low
  const reportResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          sort_by: "priority_desc",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(reportResponse);

  // 3. Validate pagination information
  TestValidator.predicate(
    "pagination exists",
    reportResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    reportResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    reportResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    reportResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    reportResponse.pagination.pages >= 0,
  );

  // 4. Validate report array exists
  TestValidator.predicate(
    "reports data array exists",
    reportResponse.data !== undefined,
  );
  TestValidator.predicate(
    "reports data is array",
    Array.isArray(reportResponse.data),
  );

  // 5. If reports exist, validate priority ordering (critical > high > medium > low)
  if (reportResponse.data.length > 0) {
    const priorityOrder: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    // Check that reports are properly ordered by priority in descending order
    for (let i = 0; i < reportResponse.data.length - 1; i++) {
      const currentReport = reportResponse.data[i];
      const nextReport = reportResponse.data[i + 1];

      const currentPriority = priorityOrder[currentReport.priority] || 0;
      const nextPriority = priorityOrder[nextReport.priority] || 0;

      TestValidator.predicate(
        `priority ordering at index ${i}: ${currentReport.priority} >= ${nextReport.priority}`,
        currentPriority >= nextPriority,
      );
    }

    // 6. Validate first report has highest priority level
    const firstReport = reportResponse.data[0];
    const priorityLevels = ["critical", "high", "medium", "low"];
    TestValidator.predicate(
      "first report priority is valid",
      priorityLevels.includes(firstReport.priority),
    );

    // 7. Validate report summary structure for first report
    TestValidator.predicate("report has id", firstReport.id !== undefined);
    TestValidator.predicate(
      "report has category",
      firstReport.category !== undefined,
    );
    TestValidator.predicate(
      "report has status",
      firstReport.status !== undefined,
    );
    TestValidator.predicate(
      "report has priority",
      firstReport.priority !== undefined,
    );
    TestValidator.predicate(
      "report has created_at",
      firstReport.created_at !== undefined,
    );
    TestValidator.predicate(
      "report has updated_at",
      firstReport.updated_at !== undefined,
    );
    TestValidator.predicate(
      "report has reporter",
      firstReport.reporter !== undefined,
    );

    // 8. If critical reports exist, validate they appear first
    const criticalReports = reportResponse.data.filter(
      (r) => r.priority === "critical",
    );
    if (criticalReports.length > 0) {
      const firstCriticalIndex = reportResponse.data.findIndex(
        (r) => r.priority === "critical",
      );
      const firstNonCriticalIndex = reportResponse.data.findIndex(
        (r) => r.priority !== "critical",
      );

      if (firstNonCriticalIndex !== -1) {
        TestValidator.predicate(
          "critical reports appear before non-critical reports",
          firstCriticalIndex < firstNonCriticalIndex,
        );
      }
    }
  }

  // 9. Validate that at least the pagination structure is correct
  TestValidator.equals(
    "pagination has expected structure",
    typeof reportResponse.pagination.current,
    "number",
  );
}
