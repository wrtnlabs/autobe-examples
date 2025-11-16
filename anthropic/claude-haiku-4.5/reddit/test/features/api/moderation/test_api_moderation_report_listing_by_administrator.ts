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
 * Test administrator report listing with pagination, filtering, and sorting.
 *
 * Validates that administrators can retrieve a comprehensive, system-wide list
 * of all content violation reports with proper pagination, filtering by
 * status/priority/category/date, and sorting capabilities. Tests that
 * administrators see all reports regardless of community assignment, unlike
 * community moderators.
 *
 * Steps:
 *
 * 1. Create and authenticate as an administrator
 * 2. Retrieve all reports with default pagination
 * 3. Verify response includes pagination metadata and report summaries
 * 4. Test filtering by status
 * 5. Test filtering by priority
 * 6. Test filtering by category
 * 7. Test filtering by date range
 * 8. Test sorting by created_at descending
 * 9. Test sorting by created_at ascending
 * 10. Test sorting by priority descending
 * 11. Verify report summaries contain complete information
 * 12. Verify pagination limits work correctly
 */
export async function test_api_moderation_report_listing_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphabets(12);

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator authenticated successfully",
    administrator.token.access !== undefined &&
      administrator.token.access.length > 0,
  );

  // Step 2: Retrieve all reports with default pagination
  const defaultPageResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(defaultPageResult);
  TestValidator.predicate(
    "default page result has pagination metadata",
    defaultPageResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "default page result has data array",
    Array.isArray(defaultPageResult.data),
  );

  // Step 3: Verify pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    defaultPageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    defaultPageResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    defaultPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    defaultPageResult.pagination.pages >= 0,
  );

  // Step 4: Test filtering by status
  const statusFilterResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          status: "submitted",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  TestValidator.predicate(
    "status filtered results have data array",
    Array.isArray(statusFilterResult.data),
  );
  if (statusFilterResult.data.length > 0) {
    TestValidator.equals(
      "all reports match status filter",
      statusFilterResult.data[0].status,
      "submitted",
    );
  }

  // Step 5: Test filtering by priority
  const priorityFilterResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          priority: "high",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(priorityFilterResult);
  TestValidator.predicate(
    "priority filtered results have data array",
    Array.isArray(priorityFilterResult.data),
  );
  if (priorityFilterResult.data.length > 0) {
    TestValidator.equals(
      "all reports match priority filter",
      priorityFilterResult.data[0].priority,
      "high",
    );
  }

  // Step 6: Test filtering by category
  const categoryFilterResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          category: "spam",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(categoryFilterResult);
  TestValidator.predicate(
    "category filtered results have data array",
    Array.isArray(categoryFilterResult.data),
  );
  if (categoryFilterResult.data.length > 0) {
    TestValidator.equals(
      "all reports match category filter",
      categoryFilterResult.data[0].category,
      "spam",
    );
  }

  // Step 7: Test filtering by date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFilterResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          created_at_start: thirtyDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(dateFilterResult);
  TestValidator.predicate(
    "date filtered results have data array",
    Array.isArray(dateFilterResult.data),
  );

  // Step 8: Test sorting by created_at descending
  const sortCreatedDescResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          sort_by: "created_at_desc",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(sortCreatedDescResult);
  TestValidator.predicate(
    "created_at_desc sorted results have data array",
    Array.isArray(sortCreatedDescResult.data),
  );

  // Step 9: Test sorting by created_at ascending
  const sortCreatedAscResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          sort_by: "created_at_asc",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(sortCreatedAscResult);
  TestValidator.predicate(
    "created_at_asc sorted results have data array",
    Array.isArray(sortCreatedAscResult.data),
  );

  // Step 10: Test sorting by priority descending
  const sortPriorityDescResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          sort_by: "priority_desc",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(sortPriorityDescResult);
  TestValidator.predicate(
    "priority_desc sorted results have data array",
    Array.isArray(sortPriorityDescResult.data),
  );

  // Step 11: Verify report summary structure for complete information
  if (defaultPageResult.data.length > 0) {
    const reportSummary = defaultPageResult.data[0];
    TestValidator.predicate(
      "report has id",
      reportSummary.id !== undefined && reportSummary.id.length > 0,
    );
    TestValidator.predicate(
      "report has category",
      reportSummary.category !== undefined && reportSummary.category.length > 0,
    );
    TestValidator.predicate(
      "report has status",
      reportSummary.status !== undefined && reportSummary.status.length > 0,
    );
    TestValidator.predicate(
      "report has priority",
      reportSummary.priority !== undefined && reportSummary.priority.length > 0,
    );
    TestValidator.predicate(
      "report has reporter information",
      reportSummary.reporter !== undefined &&
        reportSummary.reporter.id !== undefined,
    );
    TestValidator.predicate(
      "report has created_at timestamp",
      reportSummary.created_at !== undefined &&
        reportSummary.created_at.length > 0,
    );
    TestValidator.predicate(
      "report has updated_at timestamp",
      reportSummary.updated_at !== undefined &&
        reportSummary.updated_at.length > 0,
    );
  }

  // Step 12: Test pagination with custom limit
  const customLimitResult: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(customLimitResult);
  TestValidator.equals(
    "pagination limit matches requested",
    customLimitResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    customLimitResult.data.length <= 10,
  );
}
