import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_dashboard_summary_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!" as string,
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const reportConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const request: IErpHrmTimeOrganizationDashboardSummary.IRequest = {
    dateFrom: typia.random<string & tags.Format<"date">>(),
    dateTo: typia.random<string & tags.Format<"date">>(),
    page: 1,
    limit: 10,
  };
  const first =
    await api.functional.erpHrmTime.member.reports.organization_dashboard_summaries.index(
      reportConnection,
      {
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.erpHrmTime.member.reports.organization_dashboard_summaries.index(
      reportConnection,
      {
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals("pagination current", first.pagination.current, 1);
  TestValidator.equals("pagination limit", first.pagination.limit, 10);
  TestValidator.equals(
    "pagination current repeated",
    second.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit repeated",
    second.pagination.limit,
    10,
  );
  TestValidator.equals("same request should be stable", second, first);
  if (first.data.length > 0) {
    const summary = first.data[0];
    typia.assert(summary);
    TestValidator.equals(
      "page one organization summary is present",
      summary.organization,
      summary.organization,
    );
    TestValidator.predicate(
      "active employee count is non-negative",
      summary.activeEmployeeCount >= 0,
    );
    TestValidator.predicate(
      "pending timesheet count is non-negative",
      summary.pendingTimesheetCount >= 0,
    );
    TestValidator.predicate(
      "weekly hours total is non-negative",
      summary.weeklyHoursTotal >= 0,
    );
    TestValidator.predicate(
      "budget utilization count is non-negative",
      summary.budgetUtilizationOver80Count >= 0,
    );
  }
}
