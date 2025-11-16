import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Test combining multiple filters simultaneously to validate complex query
 * scenarios.
 *
 * This test verifies that the content reports API correctly applies multiple
 * filters in combination. A moderator authenticates and requests reports with
 * various filter combinations including status, reason, contentType, date
 * range, and sorting options.
 *
 * The test validates:
 *
 * 1. Moderator authentication and token generation
 * 2. Filter composition with 2-4 filters simultaneously
 * 3. Accurate pagination and result counts
 * 4. Correct ordering of results
 * 5. That only reports matching ALL criteria are returned
 *
 * Steps:
 *
 * 1. Register a moderator account
 * 2. Query reports with combined status + reason + contentType filters
 * 3. Query reports with date range filters (dateFrom/dateTo)
 * 4. Query reports with sorting by createdAt
 * 5. Query with 4 filters combined (status, reason, contentType, dateFrom)
 * 6. Validate pagination works correctly with filters
 */
export async function test_api_content_reports_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated successfully",
    moderator.token !== null,
  );

  // Step 2: Query reports with combined status + reason + contentType filters
  const combinedFilter1: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending_review",
          reason: "personal_attack",
          contentType: "article",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(combinedFilter1);
  TestValidator.predicate(
    "combined filter 1 returns paginated data",
    combinedFilter1.pagination !== null,
  );
  TestValidator.predicate(
    "combined filter 1 has data array",
    Array.isArray(combinedFilter1.data),
  );
  TestValidator.predicate(
    "combined filter 1 data items match status filter",
    combinedFilter1.data.every((report) => report.status === "pending_review"),
  );
  TestValidator.predicate(
    "combined filter 1 data items match reason filter",
    combinedFilter1.data.every((report) => report.reason === "personal_attack"),
  );

  // Step 3: Query reports with date range filters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeFilter: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          dateFrom: oneWeekAgo.toISOString(),
          dateTo: now.toISOString(),
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.predicate(
    "date range filter returns results",
    dateRangeFilter.pagination !== null,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    dateRangeFilter.pagination.records >= 0,
    true,
  );

  // Step 4: Query reports with sorting by createdAt
  const sortedFilter: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          orderBy: "createdAt",
          order: "desc",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(sortedFilter);
  TestValidator.predicate(
    "sorted filter returns results",
    sortedFilter.pagination !== null,
  );
  TestValidator.predicate(
    "sorted results are in descending order",
    sortedFilter.data.length <= 1 ||
      sortedFilter.data[0].created_at >=
        sortedFilter.data[sortedFilter.data.length - 1].created_at,
  );

  // Step 5: Query with 4 filters combined (status, reason, contentType, dateFrom)
  const combinedFilter4: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "pending_review",
          reason: "spam",
          contentType: "comment",
          dateFrom: oneWeekAgo.toISOString(),
          orderBy: "createdAt",
          order: "asc",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(combinedFilter4);
  TestValidator.predicate(
    "4-filter combination returns results",
    combinedFilter4.pagination !== null,
  );
  TestValidator.predicate(
    "4-filter combination reports match status",
    combinedFilter4.data.every((report) => report.status === "pending_review"),
  );
  TestValidator.predicate(
    "4-filter combination reports match reason",
    combinedFilter4.data.every((report) => report.reason === "spam"),
  );

  // Step 6: Validate pagination works correctly with filters
  const paginationTest: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
          status: "resolved",
          reason: "offensive_language",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination limit is correctly set to 5",
    paginationTest.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    paginationTest.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination data count does not exceed limit",
    paginationTest.data.length <= 5,
  );

  // Test another filter combination with search
  const searchFilter: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "inappropriate",
          status: "dismissed",
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(searchFilter);
  TestValidator.predicate(
    "search with status filter returns paginated results",
    searchFilter.pagination !== null,
  );
  TestValidator.predicate(
    "search with status filter reports match status",
    searchFilter.data.every((report) => report.status === "dismissed"),
  );
}
