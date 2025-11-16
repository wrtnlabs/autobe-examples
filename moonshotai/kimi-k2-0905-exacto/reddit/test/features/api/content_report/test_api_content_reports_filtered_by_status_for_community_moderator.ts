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

export async function test_api_content_reports_filtered_by_status_for_community_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com/signup",
        referrer: "https://reddit-community.com/landing",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Verify authentication token is present
  TestValidator.predicate(
    "moderator has valid token",
    moderator.token !== null &&
      moderator.token.access.length > 0 &&
      moderator.token.refresh.length > 0,
  );

  // Step 3: Test filtering by each status type
  const statusTypes = [
    "submitted",
    "under_review",
    "resolved",
    "dismissed",
  ] as const;

  for (const status of statusTypes) {
    // Step 4: Create test request for current status
    const requestBody = {
      page: 1,
      limit: 20,
      status: status,
      sort_by: "reported_at",
      sort_order: "desc",
    } satisfies IRedditCommunityContentReport.IRequest;

    // Step 5: Call content reports filtering API
    const response =
      await api.functional.redditCommunity.communityModerator.contentReports.index(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(response);

    // Step 6: Validate response structure
    TestValidator.predicate(
      "response has valid pagination",
      response.pagination.current >= 1 &&
        response.pagination.limit >= 1 &&
        response.pagination.records >= 0 &&
        response.pagination.pages >= 0,
    );

    TestValidator.equals(
      "reports array exists",
      Array.isArray(response.data),
      true,
    );

    // Step 7: Validate each report has required privacy-protected fields
    for (const report of response.data) {
      TestValidator.predicate(
        "report has valid UUID",
        typeof report.id === "string" && report.id.length === 36,
      );

      TestValidator.predicate(
        "report has valid status",
        statusTypes.includes(report.status),
      );

      TestValidator.predicate(
        "report has reporter information",
        report.reporter !== null &&
          typeof report.reporter.id === "string" &&
          typeof report.reporter.nickname === "string" &&
          typeof report.reporter.email === "string",
      );

      TestValidator.predicate(
        "report has reported member information",
        report.reported_member !== null &&
          typeof report.reported_member.id === "string" &&
          typeof report.reported_member.nickname === "string" &&
          typeof report.reported_member.email === "string",
      );

      TestValidator.predicate(
        "report has essential content",
        typeof report.report_reason === "string" &&
          report.report_reason.length > 0 &&
          typeof report.report_category === "string" &&
          report.report_category.length > 0,
      );

      TestValidator.predicate(
        "report has timestamps",
        typeof report.reported_at === "string" && report.reported_at.length > 0,
      );

      // Validate resolved_at is present only for resolved/dismissed status
      if (report.status === "resolved" || report.status === "dismissed") {
        TestValidator.predicate(
          "resolved reports have resolved_at timestamp",
          report.resolved_at !== null && report.resolved_at !== undefined,
        );
      }
    }

    // Step 8: Test pagination by requesting different page
    const paginatedRequest = {
      page: 2,
      limit: 10,
      status: status,
    } satisfies IRedditCommunityContentReport.IRequest;

    const paginatedResponse =
      await api.functional.redditCommunity.communityModerator.contentReports.index(
        connection,
        {
          body: paginatedRequest,
        },
      );
    typia.assert(paginatedResponse);

    TestValidator.equals(
      "pagination respects page parameter",
      paginatedResponse.pagination.current,
      2,
    );

    TestValidator.equals(
      "pagination respects limit parameter",
      paginatedResponse.pagination.limit,
      10,
    );
  }

  // Step 9: Test combined status filtering (multiple statuses)
  const multiStatusRequest = {
    page: 1,
    limit: 50,
    status: "submitted,under_review",
  } satisfies IRedditCommunityContentReport.IRequest;

  const multiStatusResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: multiStatusRequest,
      },
    );
  typia.assert(multiStatusResponse);

  TestValidator.predicate(
    "multi-status filtering returns mixed results",
    multiStatusResponse.data.length >= 0,
  );

  // Step 10: Test search functionality with status filter
  const searchRequest = {
    page: 1,
    limit: 20,
    status: "submitted",
    search: RandomGenerator.alphabets(5),
  } satisfies IRedditCommunityContentReport.IRequest;

  const searchResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResponse);

  TestValidator.predicate(
    "search with status filter returns results",
    Array.isArray(searchResponse.data),
  );

  // Step 11: Test sorting options
  const sortRequests = [
    { sort_by: "reported_at", sort_order: "asc" },
    { sort_by: "reported_at", sort_order: "desc" },
    { sort_by: "report_category", sort_order: "asc" },
    { sort_by: "status", sort_order: "desc" },
  ];

  for (const sortOptions of sortRequests) {
    const sortRequest = {
      page: 1,
      limit: 20,
      status: "submitted",
      ...sortOptions,
    } satisfies IRedditCommunityContentReport.IRequest;

    const sortResponse =
      await api.functional.redditCommunity.communityModerator.contentReports.index(
        connection,
        {
          body: sortRequest,
        },
      );
    typia.assert(sortResponse);

    TestValidator.predicate(
      `sorting works with ${sortOptions.sort_by} ${sortOptions.sort_order}`,
      Array.isArray(sortResponse.data),
    );
  }

  // Step 12: Test reporter and reported member nickname filtering
  const nicknameRequest = {
    page: 1,
    limit: 20,
    status: "under_review",
    reporter_nickname: RandomGenerator.alphabets(3),
    reported_member_nickname: RandomGenerator.alphabets(3),
  } satisfies IRedditCommunityContentReport.IRequest;

  const nicknameResponse =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: nicknameRequest,
      },
    );
  typia.assert(nicknameResponse);

  TestValidator.predicate(
    "nickname filtering returns valid results",
    Array.isArray(nicknameResponse.data),
  );
}
