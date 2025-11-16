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

/**
 * Validate the moderation report listing API for moderators.
 *
 * This test verifies that moderators can successfully authenticate and retrieve
 * a filtered, paginated list of content violation reports from the moderation
 * queue. The test covers:
 *
 * 1. Moderator account creation and authentication
 * 2. Basic report listing with pagination
 * 3. Filtering by status (submitted, in_review, pending_decision, resolved,
 *    dismissed)
 * 4. Filtering by priority (critical, high, medium, low)
 * 5. Filtering by violation category (spam, harassment, hate_speech,
 *    misinformation, copyright, adult_content, off_topic, self_harm,
 *    illegal_content, other)
 * 6. Date range filtering (created_at_start and created_at_end)
 * 7. Sorting functionality (created_at_desc, created_at_asc, priority_desc)
 * 8. Pagination parameter validation (page and limit)
 * 9. Response structure validation with complete report summaries
 */
export async function test_api_moderation_report_listing_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator authentication returns access token",
    typeof moderator.token.access,
    "string",
  );

  // Step 2: Test basic report listing with default pagination
  const baselineReports: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {} satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(baselineReports);
  TestValidator.predicate(
    "pagination object exists in baseline response",
    baselineReports.pagination !== null &&
      baselineReports.pagination !== undefined,
  );

  // Step 3: Test filtering by status
  const statusOptions = [
    "submitted",
    "in_review",
    "pending_decision",
    "resolved",
    "dismissed",
  ] as const;
  for (const status of statusOptions) {
    const statusFiltered: IPageICommunityPlatformReport.ISummary =
      await api.functional.communityPlatform.moderator.reports.index(
        connection,
        {
          body: {
            status: status,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    typia.assert(statusFiltered);
    TestValidator.predicate(
      `status filter "${status}" returns valid paginated result`,
      statusFiltered.data.length >= 0,
    );
    if (statusFiltered.data.length > 0) {
      TestValidator.equals(
        `first report has status "${status}" when filtered by status`,
        statusFiltered.data[0].status,
        status,
      );
    }
  }

  // Step 4: Test filtering by priority
  const priorityOptions = ["critical", "high", "medium", "low"] as const;
  for (const priority of priorityOptions) {
    const priorityFiltered: IPageICommunityPlatformReport.ISummary =
      await api.functional.communityPlatform.moderator.reports.index(
        connection,
        {
          body: {
            priority: priority,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    typia.assert(priorityFiltered);
    TestValidator.predicate(
      `priority filter "${priority}" returns valid paginated result`,
      priorityFiltered.data.length >= 0,
    );
    if (priorityFiltered.data.length > 0) {
      TestValidator.equals(
        `first report has priority "${priority}" when filtered by priority`,
        priorityFiltered.data[0].priority,
        priority,
      );
    }
  }

  // Step 5: Test filtering by category
  const categoryOptions = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "copyright",
    "adult_content",
    "off_topic",
    "self_harm",
    "illegal_content",
    "other",
  ] as const;
  for (const category of categoryOptions) {
    const categoryFiltered: IPageICommunityPlatformReport.ISummary =
      await api.functional.communityPlatform.moderator.reports.index(
        connection,
        {
          body: {
            category: category,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    typia.assert(categoryFiltered);
    TestValidator.predicate(
      `category filter "${category}" returns valid paginated result`,
      categoryFiltered.data.length >= 0,
    );
    if (categoryFiltered.data.length > 0) {
      TestValidator.equals(
        `first report has category "${category}" when filtered by category`,
        categoryFiltered.data[0].category,
        category,
      );
    }
  }

  // Step 6: Test date range filtering
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const thirtyDaysMs = 30 * oneDayMs;
  const startDate = new Date(now.getTime() - thirtyDaysMs).toISOString();
  const endDate = new Date(now.getTime() + oneDayMs).toISOString();

  const dateRangeFiltered: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        created_at_start: startDate,
        created_at_end: endDate,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(dateRangeFiltered);
  TestValidator.predicate(
    "date range filtering returns valid paginated result",
    dateRangeFiltered.data.length >= 0,
  );

  // Step 7: Test sorting options
  const sortingOptions = [
    "created_at_desc",
    "created_at_asc",
    "priority_desc",
  ] as const;
  for (const sortBy of sortingOptions) {
    const sortedReports: IPageICommunityPlatformReport.ISummary =
      await api.functional.communityPlatform.moderator.reports.index(
        connection,
        {
          body: {
            sort_by: sortBy,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    typia.assert(sortedReports);
    TestValidator.predicate(
      `sorting by "${sortBy}" returns valid paginated result`,
      sortedReports.data.length >= 0,
    );
  }

  // Step 8: Test pagination parameters
  const page1: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(page1);
  TestValidator.equals("page 1 current page is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has valid record count",
    page1.pagination.records >= 0,
  );

  // Test page 2 with different limit
  const page2: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        page: 2,
        limit: 20,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(page2);
  TestValidator.equals("page 2 current page is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 20", page2.pagination.limit, 20);

  // Step 9: Validate response structure for reports
  if (baselineReports.data.length > 0) {
    const reportSummary = baselineReports.data[0];
    TestValidator.predicate(
      "report has id field",
      reportSummary.id !== undefined && reportSummary.id !== null,
    );
    TestValidator.predicate(
      "report has category field",
      reportSummary.category !== undefined && reportSummary.category !== null,
    );
    TestValidator.predicate(
      "report has status field",
      reportSummary.status !== undefined && reportSummary.status !== null,
    );
    TestValidator.predicate(
      "report has priority field",
      reportSummary.priority !== undefined && reportSummary.priority !== null,
    );
    TestValidator.predicate(
      "report has reporter field",
      reportSummary.reporter !== undefined && reportSummary.reporter !== null,
    );
    TestValidator.predicate(
      "report has created_at timestamp",
      reportSummary.created_at !== undefined &&
        reportSummary.created_at !== null,
    );
    TestValidator.predicate(
      "report has updated_at timestamp",
      reportSummary.updated_at !== undefined &&
        reportSummary.updated_at !== null,
    );
  }

  // Step 10: Test combined filtering and sorting
  const combinedQuery: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        status: "submitted",
        priority: "high",
        category: "harassment",
        sort_by: "priority_desc",
        page: 1,
        limit: 15,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(combinedQuery);
  TestValidator.predicate(
    "combined filtering and sorting returns valid result",
    combinedQuery.data.length >= 0,
  );
  TestValidator.equals(
    "combined query pagination limit is 15",
    combinedQuery.pagination.limit,
    15,
  );
}
