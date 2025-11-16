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

export async function test_api_content_reports_paginated_browsing_for_moderation_workflow(
  connection: api.IConnection,
) {
  // 1. Create community moderator for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // 2. Test various pagination configurations

  // Test 1: Default pagination (page 1, limit 20)
  const page1Response =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(page1Response);

  TestValidator.equals(
    "page 1 default limit",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit value",
    page1Response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "page 1 data within limit",
    page1Response.data.length <= 20,
  );

  // Test 2: Small page size (limit 10, minimum allowed)
  const smallPageResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(smallPageResponse);

  TestValidator.equals(
    "small page current",
    smallPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "small page limit",
    smallPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "small page data within limit",
    smallPageResponse.data.length <= 10,
  );

  // Test 3: Large page size (limit 100, maximum allowed)
  const largePageResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(largePageResponse);

  TestValidator.equals(
    "large page limit",
    largePageResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large page data within limit",
    largePageResponse.data.length <= 100,
  );

  // Test 4: Medium page size and page number
  const mediumPageResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 5,
          limit: 50,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(mediumPageResponse);

  TestValidator.equals(
    "medium page current",
    mediumPageResponse.pagination.current,
    5,
  );
  TestValidator.equals(
    "medium page limit",
    mediumPageResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "medium page data within limit",
    mediumPageResponse.data.length <= 50,
  );

  // 3. Test pagination with various filters

  // Filter by status
  const statusFilterResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "submitted",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(statusFilterResponse);

  TestValidator.equals(
    "status filter current page",
    statusFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "status filter limit",
    statusFilterResponse.pagination.limit,
    20,
  );

  // Filter by category
  const categoryFilterResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 25,
          report_category: "spam",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(categoryFilterResponse);

  TestValidator.equals(
    "category filter current page",
    categoryFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "category filter limit",
    categoryFilterResponse.pagination.limit,
    25,
  );

  // Combined filters with search
  const combinedFilterResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 30,
          status: "under_review",
          search: "harassment",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);

  TestValidator.equals(
    "combined filter limit",
    combinedFilterResponse.pagination.limit,
    30,
  );
  TestValidator.equals(
    "combined filter current",
    combinedFilterResponse.pagination.current,
    1,
  );

  // 4. Test edge cases and boundary conditions

  // Large page number
  const largePageNumberResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 100,
          limit: 20,
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(largePageNumberResponse);

  TestValidator.equals(
    "large page number current",
    largePageNumberResponse.pagination.current,
    100,
  );

  // 5. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has all required fields",
    page1Response.pagination &&
      typeof page1Response.pagination.current === "number" &&
      typeof page1Response.pagination.limit === "number" &&
      typeof page1Response.pagination.records === "number" &&
      typeof page1Response.pagination.pages === "number",
  );

  TestValidator.predicate(
    "current page matches request",
    page1Response.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit matches request",
    page1Response.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculation is consistent",
    page1Response.pagination.pages >= page1Response.pagination.current,
  );

  // 6. Test sorting parameters
  const sortedResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
          sort_by: "reported_at",
          sort_order: "desc",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(sortedResponse);

  TestValidator.equals(
    "sorted response limit",
    sortedResponse.pagination.limit,
    15,
  );
  TestValidator.equals(
    "sorted response current",
    sortedResponse.pagination.current,
    1,
  );

  // 7. Test reporter filtering
  const reporterFilterResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          reporter_nickname: "test",
        } satisfies IRedditCommunityContentReport.IRequest,
      },
    );
  typia.assert(reporterFilterResponse);

  TestValidator.equals(
    "reporter filter current page",
    reporterFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "reporter filter limit",
    reporterFilterResponse.pagination.limit,
    20,
  );

  // 8. Validate response data structure
  TestValidator.predicate(
    "response has pagination object",
    page1Response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(page1Response.data),
  );
  TestValidator.predicate(
    "all reports have required fields",
    page1Response.data.every(
      (report) =>
        report.id &&
        report.report_reason &&
        report.report_category &&
        report.status &&
        report.reported_at &&
        report.reporter &&
        report.reported_member,
    ),
  );

  TestValidator.predicate(
    "pagination fields are valid",
    typeof page1Response.pagination.current === "number" &&
      page1Response.pagination.current >= 1 &&
      typeof page1Response.pagination.limit === "number" &&
      page1Response.pagination.limit >= 10 &&
      page1Response.pagination.limit <= 100 &&
      typeof page1Response.pagination.records === "number" &&
      page1Response.pagination.records >= 0 &&
      typeof page1Response.pagination.pages === "number" &&
      page1Response.pagination.pages >= 0,
  );

  // 9. Test pagination consistency
  const testConsistency = async () => {
    const page2 =
      await api.functional.redditCommunity.communityModerator.contentReports.index(
        connection,
        {
          body: {
            page: 2,
            limit: 25,
          } satisfies IRedditCommunityContentReport.IRequest,
        },
      );

    TestValidator.equals("consistent limit", page2.pagination.limit, 25);
    TestValidator.equals("consistent current", page2.pagination.current, 2);
    TestValidator.predicate(
      "page 2 has data or empty",
      page2.data.length <= 25,
    );
  };

  await testConsistency();

  // 10. Final validation - pagination metadata relationships
  TestValidator.predicate(
    "pages calculation is mathematically correct",
    page1Response.pagination.pages ===
      Math.ceil(
        page1Response.pagination.records / page1Response.pagination.limit,
      ),
  );
}
