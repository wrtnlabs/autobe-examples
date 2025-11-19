import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test pagination and sorting capabilities for content reports to enable
 * efficient navigation through large report datasets.
 *
 * This test validates that moderators can customize result presentation based
 * on their workflow needs by:
 *
 * 1. Testing pagination with various page sizes (default 20, maximum 100, custom
 *    values)
 * 2. Validating page navigation with accurate metadata (current page, total
 *    records, total pages)
 * 3. Testing sorting by created_at, resolved_at, and status in both ascending and
 *    descending order
 * 4. Verifying pagination metadata accuracy
 * 5. Testing combined filtering, sorting, and pagination scenarios
 *
 * Note: This test works with existing content reports in the system since the
 * API does not provide an endpoint for creating reports programmatically.
 */
export async function test_api_content_reports_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123!",
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<30>
        >(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test basic pagination with default limit
  const defaultPage: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(defaultPage);

  TestValidator.predicate(
    "pagination metadata should be valid",
    defaultPage.pagination.current === 1 &&
      defaultPage.pagination.limit >= 1 &&
      defaultPage.pagination.records >= 0 &&
      defaultPage.pagination.pages >= 0,
  );

  // Step 3: Test custom limit value of 10
  const customLimitPage: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(customLimitPage);

  TestValidator.equals(
    "custom limit of 10 should be applied",
    customLimitPage.pagination.limit,
    10,
  );

  // Step 4: Test maximum limit (100)
  const maxLimitPage: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "maximum limit of 100 should be applied",
    maxLimitPage.pagination.limit,
    100,
  );

  // Step 5: Test sorting by created_at ascending (oldest first)
  const sortedByCreatedAsc: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);

  if (sortedByCreatedAsc.data.length > 1) {
    for (let i = 0; i < sortedByCreatedAsc.data.length - 1; i++) {
      const current = new Date(sortedByCreatedAsc.data[i].created_at).getTime();
      const next = new Date(
        sortedByCreatedAsc.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "reports should be sorted by created_at ascending",
        current <= next,
      );
    }
  }

  // Step 6: Test sorting by created_at descending (newest first)
  const sortedByCreatedDesc: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);

  if (sortedByCreatedDesc.data.length > 1) {
    for (let i = 0; i < sortedByCreatedDesc.data.length - 1; i++) {
      const current = new Date(
        sortedByCreatedDesc.data[i].created_at,
      ).getTime();
      const next = new Date(
        sortedByCreatedDesc.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "reports should be sorted by created_at descending",
        current >= next,
      );
    }
  }

  // Step 7: Test sorting by resolved_at ascending
  const sortedByResolvedAsc: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "resolved_at",
          order: "asc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(sortedByResolvedAsc);

  // Step 8: Test sorting by resolved_at descending
  const sortedByResolvedDesc: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "resolved_at",
          order: "desc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(sortedByResolvedDesc);

  // Step 9: Test sorting by status alphabetically
  const sortedByStatus: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          sort_by: "status",
          order: "asc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(sortedByStatus);

  if (sortedByStatus.data.length > 1) {
    for (let i = 0; i < sortedByStatus.data.length - 1; i++) {
      const current = sortedByStatus.data[i].status;
      const next = sortedByStatus.data[i + 1].status;
      TestValidator.predicate(
        "reports should be sorted by status alphabetically",
        current <= next,
      );
    }
  }

  // Step 10: Test combined filtering, sorting, and pagination with pending status
  const combinedQueryPending: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          status: "pending",
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(combinedQueryPending);

  TestValidator.predicate(
    "combined query pagination metadata should be valid",
    combinedQueryPending.pagination.current === 1 &&
      combinedQueryPending.pagination.limit === 50 &&
      combinedQueryPending.pagination.records >= 0,
  );

  for (const report of combinedQueryPending.data) {
    TestValidator.equals(
      "filtered reports should have pending status",
      report.status,
      "pending",
    );
  }

  // Step 11: Test combined filtering with Spam category
  const combinedQuerySpam: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          report_category: "Spam",
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(combinedQuerySpam);

  for (const report of combinedQuerySpam.data) {
    TestValidator.equals(
      "filtered reports should have Spam category",
      report.report_category,
      "Spam",
    );
  }

  // Step 12: Test page navigation if multiple pages exist
  if (defaultPage.pagination.pages > 1) {
    const secondPage: IPageIDiscussionBoardContentReport.ISummary =
      await api.functional.discussionBoard.moderator.contentReports.index(
        connection,
        {
          body: {
            page: 2,
          } satisfies IDiscussionBoardContentReport.IRequest,
        },
      );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current should be 2",
      secondPage.pagination.current,
      2,
    );

    TestValidator.equals(
      "second page should have same total records",
      secondPage.pagination.records,
      defaultPage.pagination.records,
    );

    if (secondPage.data.length > 0 && defaultPage.data.length > 0) {
      TestValidator.notEquals(
        "second page should have different reports than first page",
        secondPage.data[0].id,
        defaultPage.data[0].id,
      );
    }
  }

  // Step 13: Test date range filtering with created_at
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeQuery: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(dateRangeQuery);

  for (const report of dateRangeQuery.data) {
    const createdAt = new Date(report.created_at).getTime();
    TestValidator.predicate(
      "reports should be within date range",
      createdAt >= thirtyDaysAgo.getTime() && createdAt <= now.getTime(),
    );
  }
}
