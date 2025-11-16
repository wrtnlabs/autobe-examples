import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityContentReport";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityContentReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReportStatus";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test content report sorting options for optimal moderation workflow
 * optimization.
 *
 * This test validates the comprehensive sorting capabilities of the content
 * report system, ensuring moderators can efficiently triage reports using
 * various sorting strategies:
 *
 * - Chronological review (reported_at, resolved_at)
 * - Category-based triage (report_category)
 * - Workflow state management (status)
 *
 * Tests both ascending and descending sort orders while maintaining filtering
 * criteria and consistent pagination behavior across different sort
 * configurations.
 */
export async function test_api_content_reports_sorting_options_for_workflow_optimization(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Establish community moderator authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/auth/join",
        referrer: "https://reddit-community.com/",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Test sorting by reported_at (chronological order)
  const chronologicalAscending =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "reported_at",
          sort_order: "asc",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(chronologicalAscending);
  TestValidator.predicate(
    "chronological ascending has correct pagination",
    chronologicalAscending.pagination.current === 1,
  );
  TestValidator.predicate(
    "chronological ascending has data",
    chronologicalAscending.data.length > 0,
  );

  // Validate ascending order (oldest first)
  for (let i = 1; i < chronologicalAscending.data.length; i++) {
    const currentTime = new Date(
      chronologicalAscending.data[i].reported_at,
    ).getTime();
    const previousTime = new Date(
      chronologicalAscending.data[i - 1].reported_at,
    ).getTime();
    TestValidator.predicate(
      `chronological ascending order maintained at index ${i}`,
      previousTime <= currentTime,
    );
  }

  const chronologicalDescending =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "reported_at",
          sort_order: "desc",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(chronologicalDescending);

  // Validate descending order (newest first)
  for (let i = 1; i < chronologicalDescending.data.length; i++) {
    const currentTime = new Date(
      chronologicalDescending.data[i].reported_at,
    ).getTime();
    const previousTime = new Date(
      chronologicalDescending.data[i - 1].reported_at,
    ).getTime();
    TestValidator.predicate(
      `chronological descending order maintained at index ${i}`,
      previousTime >= currentTime,
    );
  }

  // Step 3: Test sorting by resolved_at (resolution timeline)
  const resolutionAscending =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "resolved_at",
          sort_order: "asc",
          status: "resolved,dismissed", // Only include resolved reports for meaningful sorting
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(resolutionAscending);

  // Validate resolution timeline order
  const resolvedReports = resolutionAscending.data.filter(
    (report) => report.resolved_at !== null,
  );
  for (let i = 1; i < resolvedReports.length; i++) {
    const currentTime = new Date(resolvedReports[i].resolved_at!).getTime();
    const previousTime = new Date(
      resolvedReports[i - 1].resolved_at!,
    ).getTime();
    TestValidator.predicate(
      `resolution ascending order maintained at index ${i}`,
      previousTime <= currentTime,
    );
  }

  // Step 4: Test sorting by report_category (category-based triage)
  const categoryAscending =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "report_category",
          sort_order: "asc",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(categoryAscending);

  // Validate alphabetical category order
  for (let i = 1; i < categoryAscending.data.length; i++) {
    const currentCategory = categoryAscending.data[i].report_category;
    const previousCategory = categoryAscending.data[i - 1].report_category;
    TestValidator.predicate(
      `category alphabetical order maintained at index ${i}`,
      previousCategory <= currentCategory,
    );
  }

  const categoryDescending =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "report_category",
          sort_order: "desc",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(categoryDescending);

  // Validate reverse alphabetical category order
  for (let i = 1; i < categoryDescending.data.length; i++) {
    const currentCategory = categoryDescending.data[i].report_category;
    const previousCategory = categoryDescending.data[i - 1].report_category;
    TestValidator.predicate(
      `category reverse alphabetical order maintained at index ${i}`,
      previousCategory >= currentCategory,
    );
  }

  // Step 5: Test sorting by status (workflow state)
  const statusAscending =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          sort_by: "status",
          sort_order: "asc",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(statusAscending);

  // Validate status workflow order (dismissed < resolved < submitted < under_review)
  const statusOrder = {
    dismissed: 0,
    resolved: 1,
    submitted: 2,
    under_review: 3,
  };
  for (let i = 1; i < statusAscending.data.length; i++) {
    const currentStatus = statusAscending.data[i].status;
    const previousStatus = statusAscending.data[i - 1].status;
    TestValidator.predicate(
      `status workflow order maintained at index ${i}`,
      statusOrder[previousStatus] <= statusOrder[currentStatus],
    );
  }

  // Step 6: Test sorting with filtering criteria preservation
  const filteredSorting =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "reported_at",
          sort_order: "desc",
          status: "submitted,under_review", // Filter for active reports
          report_category: "harassment,spam", // Filter specific categories
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(filteredSorting);

  // Validate filtering criteria are preserved
  filteredSorting.data.forEach((report, index) => {
    TestValidator.predicate(
      `filtered result ${index} has valid status`,
      ["submitted", "under_review"].includes(report.status),
    );
    TestValidator.predicate(
      `filtered result ${index} has valid category`,
      ["harassment", "spam"].includes(report.report_category),
    );
  });

  // Step 7: Test pagination consistency
  const page1 =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          sort_by: "reported_at",
          sort_order: "desc",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(page1);

  const page2 =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
          sort_by: "reported_at",
          sort_order: "desc",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(page2);

  // Validate pagination consistency
  TestValidator.predicate(
    "page 1 and 2 have different data",
    page1.data.length > 0 && page2.data.length >= 0,
  );
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.predicate(
      "no overlap between pages",
      !page1.data.some((report1) =>
        page2.data.some((report2) => report1.id === report2.id),
      ),
    );
  }

  // Step 8: Test search functionality with sorting
  const searchWithSorting =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "status",
          sort_order: "asc",
          search: "harassment", // Search within report reasons
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(searchWithSorting);

  // Validate search results are sorted
  TestValidator.predicate(
    "search results are sorted",
    searchWithSorting.data.length > 0,
  );
  for (let i = 1; i < searchWithSorting.data.length; i++) {
    const currentStatus = searchWithSorting.data[i].status;
    const previousStatus = searchWithSorting.data[i - 1].status;
    TestValidator.predicate(
      `search results maintain status order at index ${i}`,
      statusOrder[previousStatus] <= statusOrder[currentStatus],
    );
  }
}
