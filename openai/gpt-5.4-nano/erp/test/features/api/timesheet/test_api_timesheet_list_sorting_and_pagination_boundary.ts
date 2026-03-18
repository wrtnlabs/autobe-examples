import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";

export async function test_api_timesheet_list_sorting_and_pagination_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 0. Member join & organization context setup
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-" + RandomGenerator.alphabets(10),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/" + RandomGenerator.alphabets(8),
    referrer: "https://example.com/" + RandomGenerator.alphabets(8),
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: credentials,
  });
  // Some environments require a separate selected-organization context. If the join
  // workflow already selects an org, the next call is still valid.
  // Create an extra organization to ensure we have an organization resource.
  // (Generation function is allowed and uses the correct endpoint.)
  await generate_random_erp_hrm_time_tracking_member_organizations_create(
    memberConnection,
    {
      body: {
        name: credentials.organizationName + "-" + RandomGenerator.alphabets(6),
        description: credentials.organizationDescription,
        logo_url: null,
        currency_code: credentials.organizationCurrencyCode,
        timezone: credentials.organizationTimezone,
        fiscal_start_month: credentials.organizationFiscalStartMonth,
      },
    },
  );
  const requestBase = {
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimeTrackingTimesheet.IRequest;
  // 1) Sort by week_end_at ascending
  const page1Limit10 =
    10 satisfies IErpHrmTimeTrackingTimesheet.IRequest["limit"];
  const timesheetsByWeekEndAsc =
    await api.functional.erpHrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: page1Limit10,
          sortBy: "week_end_at",
          sortDirection: "asc",
        } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(timesheetsByWeekEndAsc);
  const pageData1 = timesheetsByWeekEndAsc.data;
  TestValidator.predicate(
    "timesheets ordered by week_end_at non-decreasing (asc)",
    () =>
      pageData1.every(
        (item, index) =>
          index === pageData1.length - 1 ||
          new Date(item.week_end_at).getTime() <=
            new Date(pageData1[index + 1].week_end_at).getTime(),
      ),
  );
  TestValidator.equals(
    "pagination limit echoes request",
    timesheetsByWeekEndAsc.pagination.limit,
    page1Limit10,
  );
  TestValidator.predicate(
    "pagination current is within valid range",
    timesheetsByWeekEndAsc.pagination.current >= 1 &&
      timesheetsByWeekEndAsc.pagination.current <=
        Math.max(timesheetsByWeekEndAsc.pagination.pages, 1),
  );
  // 2) Sort by status ascending
  const limit50 = 50 satisfies IErpHrmTimeTrackingTimesheet.IRequest["limit"];
  const timesheetsByStatusAsc =
    await api.functional.erpHrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: limit50,
          sortBy: "status",
          sortDirection: "asc",
        } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(timesheetsByStatusAsc);
  const statuses = timesheetsByStatusAsc.data.map((d) => d.status);
  TestValidator.predicate(
    "timesheets ordered by status non-decreasing (asc) on the returned page",
    () =>
      statuses.every(
        (s, i) =>
          i === statuses.length - 1 ||
          statuses[i].localeCompare(statuses[i + 1]) <= 0,
      ),
  );
  TestValidator.equals(
    "pagination limit echoes request (status sort)",
    timesheetsByStatusAsc.pagination.limit,
    limit50,
  );
  // 3) Pagination boundary beyond available pages
  const boundaryLimit =
    10 satisfies IErpHrmTimeTrackingTimesheet.IRequest["limit"];
  const firstPage =
    await api.functional.erpHrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: boundaryLimit,
        } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(firstPage);
  const targetPage = (firstPage.pagination.pages + 1) satisfies number;
  const beyondPage =
    await api.functional.erpHrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          page: targetPage,
          limit: boundaryLimit,
        } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond-last-page should return empty data",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "total pages unchanged after boundary request",
    beyondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.predicate(
    "pagination current does not exceed total pages (or is clamped)",
    () =>
      beyondPage.pagination.pages === 0
        ? beyondPage.pagination.current >= 0
        : beyondPage.pagination.current <= beyondPage.pagination.pages,
  );
}
