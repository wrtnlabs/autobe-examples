import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportsOverview";
import type { IPaginationMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaginationMetadatum";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReportOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportOverviewItem";
import type { IRedditCommunityReportsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverview";
import type { IRedditCommunityReportsOverviewRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewRequest";
import type { IRedditCommunityReportsOverviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportsOverviewStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_overview_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // Test 1: Default parameters (no filters, no sorting)
  const defaultOverviewPage =
    await api.functional.redditCommunity.admin.reports.overview.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(defaultOverviewPage);
  // Validate pagination metadata
  TestValidator.equals(
    "currentPage is 1",
    defaultOverviewPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pageSize is 20",
    defaultOverviewPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "totalPages is calculated",
    defaultOverviewPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records >= 0",
    defaultOverviewPage.pagination.records >= 0,
  );
  // The data array contains IRedditCommunityReportsOverview items (each with statistics and reports)
  // Access the first item from the data array
  if (defaultOverviewPage.data.length > 0) {
    const overview = defaultOverviewPage.data[0]!;
    typia.assert(overview);
    // Validate statistics section
    TestValidator.equals(
      "statistics exists",
      overview.statistics !== undefined,
      true,
    );
    TestValidator.predicate(
      "totalPendingCount is valid",
      overview.statistics.totalPendingCount >= 0,
    );
    // Validate each report has required fields
    overview.reports.forEach((report, idx) => {
      TestValidator.equals(
        `report ${idx} has id`,
        report.id !== undefined,
        true,
      );
      TestValidator.equals(
        `report ${idx} has reason`,
        typeof report.reason === "string",
        true,
      );
      TestValidator.equals(
        `report ${idx} has status_id`,
        typeof report.status_id === "number",
        true,
      );
      TestValidator.equals(
        `report ${idx} has created_at`,
        report.created_at !== undefined,
        true,
      );
      TestValidator.equals(
        `report ${idx} has reporter`,
        report.reporter !== undefined,
        true,
      );
      TestValidator.equals(
        `report ${idx} has reporter username`,
        report.reporter.username !== undefined,
        true,
      );
      TestValidator.equals(
        `report ${idx} has targetContent`,
        report.targetContent !== undefined,
        true,
      );
      // Check type discriminator by property existence (post has 'title', comment has 'content')
      TestValidator.equals(
        `report ${idx} targetContent has type discriminator`,
        "title" in report.targetContent || "content" in report.targetContent,
        true,
      );
      // Validate only pending reports are returned
      TestValidator.equals(
        `report ${idx} is pending`,
        report.status_id === 0,
        true,
      );
      // Validate reporter summary
      TestValidator.equals(
        `report ${idx} reporter has id`,
        report.reporter.id !== undefined,
        true,
      );
      TestValidator.equals(
        `report ${idx} reporter has created_at`,
        report.reporter.created_at !== undefined,
        true,
      );
    });
    // Test 7: Statistics validation
    TestValidator.predicate(
      "statistics totalPendingCount is non-negative",
      overview.statistics.totalPendingCount >= 0,
    );
    if (
      overview.statistics.oldestReportDate !== undefined &&
      overview.statistics.oldestReportDate !== null
    ) {
      TestValidator.predicate(
        "oldestReportDate is valid date",
        new Date(overview.statistics.oldestReportDate).getTime() >= 0,
      );
    }
    if (
      overview.statistics.newestReportDate !== undefined &&
      overview.statistics.newestReportDate !== null
    ) {
      TestValidator.predicate(
        "newestReportDate is valid date",
        new Date(overview.statistics.newestReportDate).getTime() >= 0,
      );
    }
  }
  // Test 2: Sorting by createdAt descending
  const sortedOverviewPage =
    await api.functional.redditCommunity.admin.reports.overview.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortedOverviewPage);
  TestValidator.equals(
    "sorted reports is array",
    Array.isArray(sortedOverviewPage.data),
    true,
  );
  // Test 3: Content type filter for posts only
  const postOverviewPage =
    await api.functional.redditCommunity.admin.reports.overview.index(
      adminConnection,
      {
        body: {
          contentType: "post",
        },
      },
    );
  typia.assert(postOverviewPage);
  TestValidator.equals(
    "post filter reports is array",
    Array.isArray(postOverviewPage.data),
    true,
  );
  if (postOverviewPage.data.length > 0) {
    const postOverview = postOverviewPage.data[0]!;
    typia.assert(postOverview);
    postOverview.reports.forEach((report, idx) => {
      // Check type discriminator by property existence
      TestValidator.equals(
        `post report ${idx} type`,
        "title" in report.targetContent,
        true,
      );
    });
  }
  // Test 4: Content type filter for comments only
  const commentOverviewPage =
    await api.functional.redditCommunity.admin.reports.overview.index(
      adminConnection,
      {
        body: {
          contentType: "comment",
        },
      },
    );
  typia.assert(commentOverviewPage);
  TestValidator.equals(
    "comment filter reports is array",
    Array.isArray(commentOverviewPage.data),
    true,
  );
  if (commentOverviewPage.data.length > 0) {
    const commentOverview = commentOverviewPage.data[0]!;
    typia.assert(commentOverview);
    commentOverview.reports.forEach((report, idx) => {
      // Check type discriminator by property existence
      TestValidator.equals(
        `comment report ${idx} type`,
        "content" in report.targetContent,
        true,
      );
    });
  }
  // Test 5: Reporter username search
  const searchOverviewPage =
    await api.functional.redditCommunity.admin.reports.overview.index(
      adminConnection,
      {
        body: {
          reporterUsername: "a",
        },
      },
    );
  typia.assert(searchOverviewPage);
  TestValidator.equals(
    "search reports is array",
    Array.isArray(searchOverviewPage.data),
    true,
  );
  // Test 6: Date range filtering
  const dateAfter = new Date();
  dateAfter.setDate(dateAfter.getDate() - 1);
  const dateOverviewPage =
    await api.functional.redditCommunity.admin.reports.overview.index(
      adminConnection,
      {
        body: {
          createdAfter: dateAfter.toISOString(),
        },
      },
    );
  typia.assert(dateOverviewPage);
  TestValidator.equals(
    "date filter reports is array",
    Array.isArray(dateOverviewPage.data),
    true,
  );
}
