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
 * Test pagination functionality for navigating through platform-wide report
 * lists.
 *
 * Administrator authenticates and retrieves reports across multiple pages using
 * page parameter. Verify that pagination metadata (current page, limit, total
 * records, total pages) is correctly returned for all reports across
 * communities. Test that different pages return different report sets and that
 * administrators can navigate the entire platform-wide queue.
 *
 * Steps:
 *
 * 1. Administrator authenticates with join endpoint
 * 2. Request reports with default pagination (page 1, limit 10)
 * 3. Validate pagination metadata structure and values
 * 4. Request reports from page 2 if multiple pages exist
 * 5. Validate different pages return different report data
 * 6. Request reports with different limit value (5 items per page)
 * 7. Verify pagination calculation and consistency across requests
 * 8. Validate report items contain required fields
 */
export async function test_api_moderation_report_queue_administrator_pagination_page_navigation(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();

  const authenticatedAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(authenticatedAdmin);

  // Step 2: Request reports with default pagination (page 1, limit 10)
  const firstPageRequest = {
    page: 1,
    limit: 10,
    status: null,
    priority: null,
    category: null,
    created_at_start: null,
    created_at_end: null,
    moderation_assigned_to_id: null,
    reported_type: null,
    sort_by: "created_at_desc",
  } satisfies ICommunityPlatformReport.IRequest;

  const firstPageResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPageResponse);

  // Step 3: Validate pagination metadata structure and values
  TestValidator.predicate(
    "pagination metadata should exist",
    firstPageResponse.pagination !== undefined &&
      firstPageResponse.pagination !== null,
  );
  TestValidator.equals(
    "current page should be 1 in first request",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10 in first request",
    firstPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be non-negative integer",
    typeof firstPageResponse.pagination.records === "number" &&
      firstPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative integer",
    typeof firstPageResponse.pagination.pages === "number" &&
      firstPageResponse.pagination.pages >= 0,
  );

  // Validate pages calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    firstPageResponse.pagination.records / firstPageResponse.pagination.limit,
  );
  TestValidator.equals(
    "total pages should match ceil(records / limit) calculation",
    firstPageResponse.pagination.pages,
    expectedPages,
  );

  // Step 4: Validate data array structure and report items
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(firstPageResponse.data),
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    firstPageResponse.data.length <= firstPageResponse.pagination.limit,
  );

  // Validate report item structure
  if (firstPageResponse.data.length > 0) {
    const firstReport = firstPageResponse.data[0];
    TestValidator.predicate(
      "each report should have an id",
      firstReport.id !== undefined && typeof firstReport.id === "string",
    );
    TestValidator.predicate(
      "each report should have a category",
      firstReport.category !== undefined &&
        typeof firstReport.category === "string",
    );
    TestValidator.predicate(
      "each report should have a status",
      firstReport.status !== undefined &&
        typeof firstReport.status === "string",
    );
    TestValidator.predicate(
      "each report should have a priority",
      firstReport.priority !== undefined &&
        typeof firstReport.priority === "string",
    );
  }

  // Step 5: Request reports from page 2 if multiple pages exist
  if (firstPageResponse.pagination.pages > 1) {
    const secondPageRequest = {
      page: 2,
      limit: 10,
      status: null,
      priority: null,
      category: null,
      created_at_start: null,
      created_at_end: null,
      moderation_assigned_to_id: null,
      reported_type: null,
      sort_by: "created_at_desc",
    } satisfies ICommunityPlatformReport.IRequest;

    const secondPageResponse: IPageICommunityPlatformReport.ISummary =
      await api.functional.communityPlatform.administrator.reports.index(
        connection,
        {
          body: secondPageRequest,
        },
      );
    typia.assert(secondPageResponse);

    // Step 6: Validate second page metadata
    TestValidator.equals(
      "second page current should be 2",
      secondPageResponse.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit should match first page",
      secondPageResponse.pagination.limit,
      firstPageResponse.pagination.limit,
    );
    TestValidator.equals(
      "total records should match across pages",
      secondPageResponse.pagination.records,
      firstPageResponse.pagination.records,
    );

    // Validate different pages return different data if reports exist
    if (
      firstPageResponse.data.length > 0 &&
      secondPageResponse.data.length > 0
    ) {
      const firstPageIds = firstPageResponse.data.map((r) => r.id);
      const secondPageIds = secondPageResponse.data.map((r) => r.id);
      const hasDifferentReports = !firstPageIds.some((id) =>
        secondPageIds.includes(id),
      );
      TestValidator.predicate(
        "different pages should contain different reports",
        hasDifferentReports,
      );
    }
  }

  // Step 7: Request with different limit value
  const smallLimitRequest = {
    page: 1,
    limit: 5,
    status: null,
    priority: null,
    category: null,
    created_at_start: null,
    created_at_end: null,
    moderation_assigned_to_id: null,
    reported_type: null,
    sort_by: "created_at_desc",
  } satisfies ICommunityPlatformReport.IRequest;

  const smallLimitResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.administrator.reports.index(
      connection,
      {
        body: smallLimitRequest,
      },
    );
  typia.assert(smallLimitResponse);

  TestValidator.equals(
    "small limit response should have limit of 5",
    smallLimitResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "small limit response data should not exceed limit",
    smallLimitResponse.data.length <= 5,
  );

  // Step 8: Verify pagination consistency
  TestValidator.equals(
    "total records should be consistent across different limits",
    smallLimitResponse.pagination.records,
    firstPageResponse.pagination.records,
  );
  TestValidator.predicate(
    "pages calculated with smaller limit should be greater than or equal",
    smallLimitResponse.pagination.pages >= firstPageResponse.pagination.pages,
  );

  // Validate pages calculation for small limit
  const expectedSmallPages = Math.ceil(
    smallLimitResponse.pagination.records / smallLimitResponse.pagination.limit,
  );
  TestValidator.equals(
    "total pages with small limit should match ceil(records / limit) calculation",
    smallLimitResponse.pagination.pages,
    expectedSmallPages,
  );
}
