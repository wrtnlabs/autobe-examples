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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

export async function test_api_moderation_report_queue_sorting_by_priority_critical_first(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be authenticated",
    moderator.id !== null && moderator.id !== undefined,
  );

  // Step 2: Retrieve reports sorted by priority (descending - critical first)
  const reportResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        sort_by: "priority_desc",
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(reportResponse);

  // Step 3: Verify priority ordering
  const reports = reportResponse.data;

  if (reports.length > 1) {
    // Define priority ordering (higher index = lower priority)
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    // Validate that reports are sorted by priority descending (critical first)
    for (let i = 0; i < reports.length - 1; i++) {
      const currentPriority = priorityOrder[reports[i].priority] ?? 999;
      const nextPriority = priorityOrder[reports[i + 1].priority] ?? 999;

      TestValidator.predicate(
        `report at index ${i} should have priority equal or higher than report at index ${i + 1}`,
        currentPriority <= nextPriority,
      );
    }

    // Verify critical priority reports appear first if they exist
    const criticalReports = reports.filter(
      (report) => report.priority === "critical",
    );
    const nonCriticalReports = reports.filter(
      (report) => report.priority !== "critical",
    );

    if (criticalReports.length > 0 && nonCriticalReports.length > 0) {
      TestValidator.predicate(
        "all critical reports should appear before non-critical reports",
        reports.indexOf(criticalReports[criticalReports.length - 1]) <
          reports.indexOf(nonCriticalReports[0]),
      );
    }

    // Verify high priority comes after critical
    const highReports = reports.filter((report) => report.priority === "high");
    const mediumReports = reports.filter(
      (report) => report.priority === "medium",
    );
    const lowReports = reports.filter((report) => report.priority === "low");

    if (
      highReports.length > 0 &&
      mediumReports.length > 0 &&
      lowReports.length > 0
    ) {
      const lastHighIndex = reports.indexOf(
        highReports[highReports.length - 1],
      );
      const firstMediumIndex = reports.indexOf(mediumReports[0]);
      const lastMediumIndex = reports.indexOf(
        mediumReports[mediumReports.length - 1],
      );
      const firstLowIndex = reports.indexOf(lowReports[0]);

      TestValidator.predicate(
        "high priority reports should appear before medium priority reports",
        lastHighIndex < firstMediumIndex,
      );

      TestValidator.predicate(
        "medium priority reports should appear before low priority reports",
        lastMediumIndex < firstLowIndex,
      );
    }
  }

  // Step 4: Verify pagination information is valid
  TestValidator.predicate(
    "pagination current page should be valid",
    reportResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    reportResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    reportResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    reportResponse.pagination.pages >= 0,
  );
}
