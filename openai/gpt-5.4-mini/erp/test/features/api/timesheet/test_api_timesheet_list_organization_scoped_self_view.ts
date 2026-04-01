import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
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

export async function test_api_timesheet_list_organization_scoped_self_view(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const now = new Date();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  const request: IErpHrmTimeTimesheet.IRequest = {
    status: null,
    weekStartDateFrom: monday.toISOString(),
    weekStartDateTo: sunday.toISOString(),
    weekEndDateFrom: monday.toISOString(),
    weekEndDateTo: sunday.toISOString(),
    submittedAtFrom: null,
    submittedAtTo: null,
    reviewedAtFrom: null,
    reviewedAtTo: null,
    sort: null,
    page: 1,
    limit: 20,
  };
  const page = await api.functional.erpHrmTime.member.timesheets.index(
    memberConnection,
    { body: request },
  );
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records are non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data length does not exceed limit",
    page.data.length <= page.pagination.limit,
    true,
  );
  for (const item of page.data) {
    typia.assert(item);
    TestValidator.predicate("timesheet id present", item.id.length > 0);
    TestValidator.predicate(
      "week start is inside requested range",
      item.weekStartDate >= monday.toISOString() &&
        item.weekStartDate <= sunday.toISOString(),
    );
    TestValidator.predicate(
      "week end is inside requested range",
      item.weekEndDate >= monday.toISOString() &&
        item.weekEndDate <= sunday.toISOString(),
    );
    TestValidator.predicate("status is present", item.status.length > 0);
    TestValidator.predicate("createdAt is present", item.createdAt.length > 0);
    TestValidator.predicate("updatedAt is present", item.updatedAt.length > 0);
    TestValidator.predicate(
      "employee summary is present",
      item.employee !== null,
    );
  }
  const narrowPage = await api.functional.erpHrmTime.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "submitted",
        weekStartDateFrom: monday.toISOString(),
        weekStartDateTo: sunday.toISOString(),
        weekEndDateFrom: monday.toISOString(),
        weekEndDateTo: sunday.toISOString(),
        submittedAtFrom: null,
        submittedAtTo: null,
        reviewedAtFrom: null,
        reviewedAtTo: null,
        sort: null,
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimeTimesheet.IRequest,
    },
  );
  typia.assert(narrowPage);
  TestValidator.predicate(
    "filtered result set does not exceed unfiltered result set",
    narrowPage.pagination.records <= page.pagination.records,
  );
  for (const item of narrowPage.data) {
    typia.assert(item);
    TestValidator.equals(
      "filtered status matches request",
      item.status,
      "submitted",
    );
    TestValidator.predicate(
      "filtered week start is inside requested range",
      item.weekStartDate >= monday.toISOString() &&
        item.weekStartDate <= sunday.toISOString(),
    );
    TestValidator.predicate(
      "filtered week end is inside requested range",
      item.weekEndDate >= monday.toISOString() &&
        item.weekEndDate <= sunday.toISOString(),
    );
  }
}
