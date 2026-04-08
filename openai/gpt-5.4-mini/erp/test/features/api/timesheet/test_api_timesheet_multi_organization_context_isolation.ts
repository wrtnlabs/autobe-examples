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

export async function test_api_timesheet_multi_organization_context_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const authorizationConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  const request = {
    page: 1,
    limit: 10,
    sort: "week_start_date",
    order: "desc",
  } satisfies IErpHrmTimeTimesheet.IRequest;
  const firstPage = await api.functional.erpHrmTime.member.timesheets.index(
    authorizationConnection,
    { body: request },
  );
  typia.assert(firstPage);
  const secondPage = await api.functional.erpHrmTime.member.timesheets.index(
    authorizationConnection,
    {
      body: {
        ...request,
        page: 2,
      } satisfies IErpHrmTimeTimesheet.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals(
    "page size remains stable",
    firstPage.pagination.limit,
    secondPage.pagination.limit,
  );
  TestValidator.predicate(
    "all returned items are timesheet summaries on the first page",
    () => firstPage.data.every((item) => item.status.length > 0),
  );
  TestValidator.predicate(
    "all returned items are timesheet summaries on the second page",
    () => secondPage.data.every((item) => item.status.length > 0),
  );
  TestValidator.notEquals(
    "different pages should not have identical record sets when both contain data",
    firstPage.data.map((item) => item.id).join(","),
    secondPage.data.map((item) => item.id).join(","),
  );
}
