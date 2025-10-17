import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportStatus";
import type { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";

/**
 * Test retrieval of a paginated list of report statuses without authentication.
 *
 * This test verifies the public PATCH /redditCommunity/reportStatuses API
 * endpoint that returns a paginated, filtered list of report statuses used in
 * the redditCommunity platform.
 *
 * Steps:
 *
 * 1. Request report statuses with default pagination (no filters).
 * 2. Request with specific pagination parameters (page=1, limit=3).
 * 3. Request with name filtering for a known partial name.
 * 4. Request with name filtering that yields zero results.
 * 5. Validate that responses conform to the
 *    IPageIRedditCommunityReportStatus.ISummary schema.
 * 6. Validate pagination metadata including page, limit, records, and pages.
 * 7. Validate that returned data respects filter criteria.
 *
 * No authentication dependencies are required for this public endpoint.
 *
 * Validates realistic scenarios for pagination, filtering, and sorting.
 */
export async function test_api_report_status_list_retrieval_public(
  connection: api.IConnection,
) {
  // 1. Default pagination request: no filters
  const defaultRequest = {} satisfies IRedditCommunityReportStatus.IRequest;
  const defaultResponse =
    await api.functional.redditCommunity.reportStatuses.index(connection, {
      body: defaultRequest,
    });
  typia.assert(defaultResponse);

  TestValidator.predicate(
    "default response has data array",
    Array.isArray(defaultResponse.data),
  );
  TestValidator.predicate(
    "default response pagination valid",
    defaultResponse.pagination.current >= 0 &&
      defaultResponse.pagination.limit >= 0 &&
      defaultResponse.pagination.records >= 0 &&
      defaultResponse.pagination.pages >= 0,
  );

  // 2. Pagination test: page=1, limit=3
  const pageLimitRequest = {
    page: 1,
    limit: 3,
  } satisfies IRedditCommunityReportStatus.IRequest;
  const pageLimitResponse =
    await api.functional.redditCommunity.reportStatuses.index(connection, {
      body: pageLimitRequest,
    });
  typia.assert(pageLimitResponse);

  if (pageLimitRequest.page !== null && pageLimitRequest.page !== undefined) {
    TestValidator.equals(
      "page matches request",
      pageLimitResponse.pagination.current,
      pageLimitRequest.page,
    );
  }

  if (pageLimitRequest.limit !== null && pageLimitRequest.limit !== undefined) {
    TestValidator.equals(
      "limit matches request",
      pageLimitResponse.pagination.limit,
      pageLimitRequest.limit,
    );
  }

  TestValidator.predicate(
    "page limit response data length <= limit",
    pageLimitResponse.data.length <=
      (pageLimitRequest.limit ?? Number.MAX_SAFE_INTEGER),
  );

  // 3. Filtering by name (partial match)
  if (defaultResponse.data.length > 0) {
    const validName = defaultResponse.data[0].name;
    const filterRequest = {
      name: validName,
    } satisfies IRedditCommunityReportStatus.IRequest;
    const filterResponse =
      await api.functional.redditCommunity.reportStatuses.index(connection, {
        body: filterRequest,
      });
    typia.assert(filterResponse);

    TestValidator.predicate(
      "filter response names include filter string",
      filterResponse.data.every((item) =>
        item.name.toLowerCase().includes(validName.toLowerCase()),
      ),
    );
  }

  // 4. Filtering by name that yields no results
  const noResultsName = "this_report_status_name_should_not_exist_123";
  const noResultsRequest = {
    name: noResultsName,
  } satisfies IRedditCommunityReportStatus.IRequest;
  const noResultsResponse =
    await api.functional.redditCommunity.reportStatuses.index(connection, {
      body: noResultsRequest,
    });
  typia.assert(noResultsResponse);
  TestValidator.equals(
    "no results returned for non-existent name",
    noResultsResponse.data.length,
    0,
  );

  // 5. Check pagination metadata consistency
  const pagination = defaultResponse.pagination;
  TestValidator.predicate(
    "pagination total pages correct",
    pagination.pages ===
      Math.ceil(pagination.records / (pagination.limit || 1)),
  );
  TestValidator.predicate(
    "pagination current page consistent",
    pagination.current >= 0 &&
      (pagination.pages === 0 || pagination.current < pagination.pages),
  );
}
