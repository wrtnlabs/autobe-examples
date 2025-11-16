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
 * Test pagination functionality for navigating through report lists.
 *
 * Moderator authenticates and retrieves reports across multiple pages using
 * page parameter (starting from page 1). Verify that pagination metadata
 * (current page, limit, total records, total pages) is correctly returned.
 * Retrieve multiple pages sequentially and validate that different reports
 * appear on different pages. Test that page=1 returns the first set of results
 * and subsequent pages return different result sets.
 */
export async function test_api_moderation_report_queue_pagination_page_navigation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/moderator/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve first page of reports
  const firstPageResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(firstPageResponse);

  // Step 3: Validate first page pagination metadata
  const firstPagination: IPage.IPagination = firstPageResponse.pagination;
  TestValidator.equals(
    "first page number should be 1",
    firstPagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be 10",
    firstPagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page should have records",
    firstPagination.records >= 0,
  );
  TestValidator.predicate(
    "first page should have valid pages count",
    firstPagination.pages >= 0,
  );

  // Step 4: Store first page report IDs for comparison
  const firstPageReportIds = firstPageResponse.data.map((report) => report.id);
  TestValidator.predicate(
    "first page should have data",
    firstPageReportIds.length > 0 || firstPagination.records === 0,
  );

  // Step 5: Check if there are multiple pages available
  if (firstPagination.pages > 1) {
    // Step 6: Retrieve second page of reports
    const secondPageResponse: IPageICommunityPlatformReport.ISummary =
      await api.functional.communityPlatform.moderator.reports.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    typia.assert(secondPageResponse);

    // Step 7: Validate second page pagination metadata
    const secondPagination: IPage.IPagination = secondPageResponse.pagination;
    TestValidator.equals(
      "second page number should be 2",
      secondPagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit should match first page limit",
      secondPagination.limit,
      firstPagination.limit,
    );
    TestValidator.equals(
      "second page total records should match first page",
      secondPagination.records,
      firstPagination.records,
    );
    TestValidator.equals(
      "second page total pages should match first page",
      secondPagination.pages,
      firstPagination.pages,
    );

    // Step 8: Validate different reports on different pages
    const secondPageReportIds = secondPageResponse.data.map(
      (report) => report.id,
    );
    if (firstPageReportIds.length > 0 && secondPageReportIds.length > 0) {
      TestValidator.notEquals(
        "second page should contain different reports than first page",
        firstPageReportIds,
        secondPageReportIds,
      );
    }
  }

  // Step 9: Test with custom limit
  const customLimitResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.moderator.reports.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformReport.IRequest,
    });
  typia.assert(customLimitResponse);

  // Step 10: Validate custom limit pagination
  TestValidator.equals(
    "custom limit page should be 1",
    customLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit should be 5",
    customLimitResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    customLimitResponse.data.length <= 5,
  );

  // Step 11: Verify total records is consistent across different limit requests
  TestValidator.equals(
    "total records should be consistent regardless of limit",
    customLimitResponse.pagination.records,
    firstPageResponse.pagination.records,
  );
}
