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

export async function test_api_timesheet_list_week_range_consistency_and_employee_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "Pass!1234";
  const unique = RandomGenerator.alphabets(8);
  const memberEmail = `${unique.toLowerCase()}@example.com` satisfies string &
    import("typia").tags.Format<"email">;
  const joinBody = {
    email: memberEmail,
    password,
    organizationName: `org-${unique}`,
    organizationDescription: `desc-${unique}`,
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  const limitSmall = 5;
  const pageSizeLarge = 20;
  // Get baseline list to discover week boundaries and caller employee id
  const page1Base =
    await api.functional.erpHrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: limitSmall,
          sortBy: "week_start_at",
          sortDirection: "desc",
        } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(page1Base);
  TestValidator.predicate(
    "has at least one timesheet record for baseline",
    page1Base.data.length > 0,
  );
  const firstItem = page1Base.data[0]!;
  const employeeId = firstItem.employee.id;
  const weekStartAt = firstItem.week_start_at;
  const weekEndAt = firstItem.week_end_at;
  const page1 = await api.functional.erpHrmTimeTracking.member.timesheets.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: limitSmall,
        sortBy: "week_start_at",
        sortDirection: "desc",
        weekStartAt,
        weekEndAt,
      } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.erpHrmTimeTracking.member.timesheets.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: limitSmall,
        sortBy: "week_start_at",
        sortDirection: "desc",
        weekStartAt,
        weekEndAt,
      } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
    },
  );
  typia.assert(page2);
  const idsPage1 = new Set(page1.data.map((t) => t.id));
  for (const item of page2.data) {
    TestValidator.predicate(
      "no overlap between page1 and page2 for same filters",
      !idsPage1.has(item.id),
    );
  }
  for (const item of page1.data) {
    TestValidator.equals("employee scope page1", item.employee.id, employeeId);
  }
  for (const item of page2.data) {
    TestValidator.equals("employee scope page2", item.employee.id, employeeId);
  }
  if (page1.pagination.records > page1.pagination.limit) {
    TestValidator.predicate(
      "pagination has at least 2 pages when records exceed limit",
      page1.pagination.pages >= 2,
    );
  }
  // Scenario 2: week range filter with weekStartAt only
  const weekStartOnly =
    await api.functional.erpHrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: pageSizeLarge,
          sortBy: "week_start_at",
          sortDirection: "desc",
          weekStartAt,
        } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(weekStartOnly);
  for (const item of weekStartOnly.data) {
    TestValidator.predicate(
      "week_start_at should be within lower bound",
      item.week_start_at >= weekStartAt,
    );
  }
  // Scenario 3: employeeId omitted vs provided by authorized caller
  const withoutEmployee =
    await api.functional.erpHrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: pageSizeLarge,
          sortBy: "week_start_at",
          sortDirection: "desc",
          employeeId: undefined,
        } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(withoutEmployee);
  for (const item of withoutEmployee.data) {
    TestValidator.equals(
      "employee scope default (employeeId omitted)",
      item.employee.id,
      employeeId,
    );
  }
  const withEmployee =
    await api.functional.erpHrmTimeTracking.member.timesheets.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: pageSizeLarge,
          sortBy: "week_start_at",
          sortDirection: "desc",
          employeeId,
        } satisfies IErpHrmTimeTrackingTimesheet.IRequest,
      },
    );
  typia.assert(withEmployee);
  const idsWithout = withoutEmployee.data.map((t) => t.id);
  const idsWith = withEmployee.data.map((t) => t.id);
  TestValidator.equals(
    "results identical when employeeId provided (same scope)",
    idsWith,
    idsWithout,
  );
}
