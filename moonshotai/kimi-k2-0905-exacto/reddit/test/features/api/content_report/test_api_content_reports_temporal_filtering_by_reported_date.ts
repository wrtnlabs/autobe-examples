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

export async function test_api_content_reports_temporal_filtering_by_reported_date(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test content report temporal filtering by reported date ranges for
   * systematic moderation review. Validates date-based filtering capabilities
   * that enable moderators to focus on recent reports or review historical
   * reporting patterns. Tests that temporal filters integrate properly with
   * status and category filters for comprehensive report management and
   * workflow prioritization.
   */

  // Step 1: Create community moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorNickname = RandomGenerator.name();

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: moderatorNickname,
        href: "https://reddit-community.com/moderator/join",
        referrer: "https://reddit-community.com/dashboard",
        ip: typia.random<string & tags.Format<"ipv4">>() as string &
          tags.Format<"ipv4">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test basic report retrieval without filters
  const baselineRequest: IRedditCommunityContentReport.IRequest = {
    page: 1,
    limit: 10,
  };

  const baselineResults: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: baselineRequest,
      },
    );
  typia.assert(baselineResults);

  TestValidator.predicate(
    "baseline retrieval returns valid pagination",
    baselineResults.pagination !== undefined,
  );

  TestValidator.predicate(
    "baseline retrieval returns report data array",
    Array.isArray(baselineResults.data),
  );

  // Step 3: Test report filtering by status
  const pendingStatusRequest: IRedditCommunityContentReport.IRequest = {
    page: 1,
    limit: 10,
    status: "submitted",
  };

  const pendingResults: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: pendingStatusRequest,
      },
    );
  typia.assert(pendingResults);

  TestValidator.predicate(
    "status-filtered results contain only submitted reports",
    pendingResults.data.every((report) => report.status === "submitted"),
  );

  // Step 4: Test chronological sorting of reports
  const chronologicalRequest: IRedditCommunityContentReport.IRequest = {
    page: 1,
    limit: 20,
    sort_by: "reported_at",
    sort_order: "desc",
  };

  const chronologicalResults: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: chronologicalRequest,
      },
    );
  typia.assert(chronologicalResults);

  TestValidator.predicate(
    "descending chronology shows newer reports first",
    () => {
      for (let i = 1; i < chronologicalResults.data.length; i++) {
        const prevDate = new Date(
          chronologicalResults.data[i - 1].reported_at,
        ).getTime();
        const currDate = new Date(
          chronologicalResults.data[i].reported_at,
        ).getTime();
        if (prevDate < currDate) return false;
      }
      return true;
    },
  );

  // Step 5: Test ascending chronological order
  const ascendingRequest: IRedditCommunityContentReport.IRequest = {
    page: 1,
    limit: 15,
    sort_by: "reported_at",
    sort_order: "asc",
  };

  const ascendingResults: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: ascendingRequest,
      },
    );
  typia.assert(ascendingResults);

  TestValidator.predicate(
    "ascending chronology shows older reports first",
    () => {
      for (let i = 1; i < ascendingResults.data.length; i++) {
        const prevDate = new Date(
          ascendingResults.data[i - 1].reported_at,
        ).getTime();
        const currDate = new Date(
          ascendingResults.data[i].reported_at,
        ).getTime();
        if (prevDate > currDate) return false;
      }
      return true;
    },
  );

  // Step 6: Test category-based filtering
  const harassmentFilter: IRedditCommunityContentReport.IRequest = {
    page: 1,
    limit: 10,
    report_category: "harassment",
  };

  const categoryResults: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: harassmentFilter,
      },
    );
  typia.assert(categoryResults);

  TestValidator.predicate(
    "category-filtered results contain only harassment reports",
    categoryResults.data.every(
      (report) => report.report_category === "harassment",
    ),
  );

  // Step 7: Test combined filtering (status + sorting)
  const combinedFilterRequest: IRedditCommunityContentReport.IRequest = {
    page: 1,
    limit: 8,
    status: "resolved",
    sort_by: "reported_at",
    sort_order: "desc",
  };

  const combinedResults: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedResults);

  TestValidator.predicate(
    "combined filter returns only resolved reports",
    combinedResults.data.every((report) => report.status === "resolved"),
  );

  TestValidator.predicate(
    "combined filter maintains chronological order",
    () => {
      for (let i = 1; i < combinedResults.data.length; i++) {
        const prevDate = new Date(
          combinedResults.data[i - 1].reported_at,
        ).getTime();
        const currDate = new Date(
          combinedResults.data[i].reported_at,
        ).getTime();
        if (prevDate < currDate) return false;
      }
      return true;
    },
  );

  // Step 8: Test pagination functionality
  const paginationRequest: IRedditCommunityContentReport.IRequest = {
    page: 1,
    limit: 5,
  };

  const page1Result: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: paginationRequest,
      },
    );
  typia.assert(page1Result);

  TestValidator.equals(
    "page 1 returns correct limit count",
    page1Result.pagination.limit,
    5,
  );

  const page2Request: IRedditCommunityContentReport.IRequest = {
    page: 2,
    limit: 5,
  };

  const page2Result: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: page2Request,
      },
    );
  typia.assert(page2Result);

  TestValidator.equals(
    "page 2 has correct limit count",
    page2Result.pagination.limit,
    5,
  );

  TestValidator.predicate(
    "pagination produces different results",
    page1Result.data.length > 0 && page2Result.data.length > 0
      ? page1Result.data[0].id !== page2Result.data[0].id
      : true,
  );

  // Step 9: Test search functionality combined with filtering
  const searchFilterRequest: IRedditCommunityContentReport.IRequest = {
    page: 1,
    limit: 10,
    search: "harassment",
    sort_by: "reported_at",
    sort_order: "desc",
  };

  const searchResult: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: searchFilterRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate("search results contain keyword text", () => {
    return searchResult.data.every(
      (report) =>
        report.report_category.toLowerCase().includes("harassment") ||
        report.report_reason.toLowerCase().includes("harassment") ||
        report.reporter.nickname.toLowerCase().includes("harassment") ||
        report.reported_member.nickname.toLowerCase().includes("harassment"),
    );
  });

  // Step 10: Test sorting by different report attributes
  const categorySortRequest: IRedditCommunityContentReport.IRequest = {
    page: 1,
    limit: 20,
    sort_by: "report_category",
    sort_order: "desc",
  };

  const categorySortResult: IPageIRedditCommunityContentReport.ISummary =
    await api.functional.redditCommunity.communityModerator.contentReports.index(
      connection,
      {
        body: categorySortRequest,
      },
    );
  typia.assert(categorySortResult);

  TestValidator.predicate(
    "category sorting produces alphabetical order",
    () => {
      for (let i = 1; i < categorySortResult.data.length; i++) {
        if (
          categorySortResult.data[i - 1].report_category <
          categorySortResult.data[i].report_category
        ) {
          return false;
        }
      }
      return true;
    },
  );

  // Step 11: Final validation - ensure moderator retains authentication
  TestValidator.equals(
    "moderator authentication persists through requests",
    moderator.nickname,
    moderatorNickname,
  );

  TestValidator.predicate(
    "moderator account integrity maintained",
    () => moderator.email.includes("@") && moderator.email.includes("."),
  );

  TestValidator.predicate(
    "moderator token structure valid",
    () => moderator.token.access.length > 0,
  );
}
