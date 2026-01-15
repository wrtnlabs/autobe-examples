import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_pagination_and_lifecycle_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin using authorization utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate random reporter ID for report filtering
  const reporterId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create request body for first page with limit=10 and offset=0
  const firstPageRequest: ICommunityPlatformReport.IRequest = {
    reporter_id: reporterId,
    limit: 10,
    offset: 0,
  } satisfies ICommunityPlatformReport.IRequest;
  // Step 4: Fetch first page of reports
  const firstPageResponse: IPageICommunityPlatformReport =
    await api.functional.communityPlatform.admin.reports.index(
      adminConnection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPageResponse);
  // Step 5: Validate pagination metadata for first page
  const firstPagination = firstPageResponse.pagination;
  TestValidator.equals(
    "first page current equals 1",
    firstPagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPagination.limit, 10);
  TestValidator.predicate(
    "first page records > 0",
    firstPagination.records > 0,
  );
  TestValidator.equals(
    "first page pages calculated correctly",
    firstPagination.pages,
    Math.ceil(firstPagination.records / firstPagination.limit),
  );
  // Step 6: Validate that each report has required analytics fields
  // Since typia.assert already validates the entire structure including all tags,
  // no additional type validation needed
  // Step 7: Create request body for second page with limit=10 and offset=10
  const secondPageRequest: ICommunityPlatformReport.IRequest = {
    reporter_id: reporterId,
    limit: 10,
    offset: 10,
  } satisfies ICommunityPlatformReport.IRequest;
  // Step 8: Fetch second page of reports
  const secondPageResponse: IPageICommunityPlatformReport =
    await api.functional.communityPlatform.admin.reports.index(
      adminConnection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPageResponse);
  // Step 9: Validate pagination metadata for second page
  const secondPagination = secondPageResponse.pagination;
  TestValidator.equals(
    "second page current equals 2",
    secondPagination.current,
    2,
  );
  TestValidator.equals("second page limit", secondPagination.limit, 10);
  TestValidator.equals(
    "second page records matches first page",
    secondPagination.records,
    firstPagination.records,
  );
  TestValidator.equals(
    "second page pages matches first page",
    secondPagination.pages,
    firstPagination.pages,
  );
  // Step 10: Validate continuity between pages (no duplication)
  // Get last report from first page and first report from second page
  const lastReportFirstPage =
    firstPageResponse.data[firstPageResponse.data.length - 1];
  const firstReportSecondPage = secondPageResponse.data[0];
  // Since ICommunityPlatformReport has no 'id' property, validate continuity
  // by comparing the entire analytics data of the reports
  TestValidator.notEquals(
    "no data duplication between pages",
    lastReportFirstPage.daily_report_rate,
    firstReportSecondPage.daily_report_rate,
  );
  TestValidator.notEquals(
    "no data duplication between pages",
    lastReportFirstPage.weekly_growth_rate,
    firstReportSecondPage.weekly_growth_rate,
  );
  TestValidator.notEquals(
    "no data duplication between pages",
    lastReportFirstPage.monthly_growth_rate,
    firstReportSecondPage.monthly_growth_rate,
  );
  // Step 11: Validate pagination logic - if there are more than 2 pages
  if (firstPagination.pages > 2) {
    const thirdPageRequest: ICommunityPlatformReport.IRequest = {
      reporter_id: reporterId,
      limit: 10,
      offset: 20,
    } satisfies ICommunityPlatformReport.IRequest;
    const thirdPageResponse: IPageICommunityPlatformReport =
      await api.functional.communityPlatform.admin.reports.index(
        adminConnection,
        {
          body: thirdPageRequest,
        },
      );
    typia.assert(thirdPageResponse);
    TestValidator.equals(
      "third page current",
      thirdPageResponse.pagination.current,
      3,
    );
  }
}
