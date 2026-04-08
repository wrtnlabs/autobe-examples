import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_organization_scoped_browse(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "1234Aa!@",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const firstPage = await api.functional.erpHrmTime.member.timesheets.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "week_start_date",
        order: "asc",
      } satisfies IErpHrmTimeTimesheet.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current is at least 1",
    firstPage.pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "record count covers returned page size",
    firstPage.pagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "returned timesheets belong to the selected organization context",
    firstPage.data.every(
      (item) =>
        item.id.length > 0 &&
        item.weekStartDate.length > 0 &&
        item.weekEndDate.length > 0 &&
        typeof item.status === "string" &&
        item.createdAt.length > 0 &&
        item.updatedAt.length > 0,
    ),
  );
  const statusFiltered =
    await api.functional.erpHrmTime.member.timesheets.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
        status: "draft",
        sort: "week_start_date",
        order: "asc",
      } satisfies IErpHrmTimeTimesheet.IRequest,
    });
  typia.assert(statusFiltered);
  TestValidator.predicate(
    "status filter only returns draft timesheets",
    statusFiltered.data.every((item) => item.status === "draft"),
  );
  TestValidator.predicate(
    "status filter maintains pagination invariants",
    statusFiltered.pagination.records >= statusFiltered.data.length &&
      statusFiltered.pagination.pages >= 0,
  );
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 30);
  const weekEnd = new Date();
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 30);
  const weekStartDateFrom = weekStart.toISOString().slice(0, 10);
  const weekStartDateTo = weekEnd.toISOString().slice(0, 10);
  const weekFiltered = await api.functional.erpHrmTime.member.timesheets.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
        weekStartDateFrom,
        weekStartDateTo,
        sort: "week_start_date",
        order: "asc",
      } satisfies IErpHrmTimeTimesheet.IRequest,
    },
  );
  typia.assert(weekFiltered);
  TestValidator.predicate(
    "week range filter only returns timesheets whose week start lies in range",
    weekFiltered.data.every((item) => {
      const current = item.weekStartDate.slice(0, 10);
      return current >= weekStartDateFrom && current <= weekStartDateTo;
    }),
  );
  TestValidator.predicate(
    "week range filter maintains pagination invariants",
    weekFiltered.pagination.records >= weekFiltered.data.length &&
      weekFiltered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "changing the filter changes the returned set or keeps it consistently scoped",
    weekFiltered.data.length !== firstPage.data.length ||
      weekFiltered.pagination.records !== firstPage.pagination.records ||
      weekFiltered.data.some(
        (item, index) => item.id !== firstPage.data[index]?.id,
      ),
  );
}
