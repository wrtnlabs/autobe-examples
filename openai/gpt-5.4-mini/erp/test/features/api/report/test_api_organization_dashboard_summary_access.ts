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

export async function test_api_organization_dashboard_summary_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
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
  const today = new Date();
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const request = {
    page: 1,
    limit: 20,
    dateFrom: oneWeekAgo.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
  } satisfies IErpHrmTimeOrganizationDashboardSummary.IRequest;
  const output =
    await api.functional.erpHrmTime.member.reports.organization_dashboard_summaries.index(
      reportConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current matches request page",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request limit",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    () => output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    () => output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size does not exceed limit",
    () => output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "data count cannot exceed total records",
    () => output.data.length <= output.pagination.records,
  );
  for (const row of output.data) {
    typia.assert(row);
    TestValidator.predicate(
      "active employee count is non-negative",
      () => row.activeEmployeeCount >= 0,
    );
    TestValidator.predicate(
      "pending timesheet count is non-negative",
      () => row.pendingTimesheetCount >= 0,
    );
    TestValidator.predicate(
      "weekly hours total is non-negative",
      () => row.weeklyHoursTotal >= 0,
    );
    TestValidator.predicate(
      "budget utilization count is non-negative",
      () => row.budgetUtilizationOver80Count >= 0,
    );
    TestValidator.predicate(
      "snapshot date is present",
      () => row.snapshotDate.length > 0,
    );
    TestValidator.predicate(
      "organization summary is present",
      () => row.organization !== null,
    );
    TestValidator.predicate(
      "top project budget hours are consistent",
      () =>
        row.topProjectId === null ||
        row.topProjectBudgetHours === null ||
        row.topProjectBudgetHours >= 0,
    );
    TestValidator.predicate(
      "top project actual hours are consistent",
      () =>
        row.topProjectId === null ||
        row.topProjectActualHours === null ||
        row.topProjectActualHours >= 0,
    );
    TestValidator.predicate(
      "top project utilization percent is consistent",
      () =>
        row.topProjectId === null ||
        row.topProjectBudgetUtilizationPercent === null ||
        row.topProjectBudgetUtilizationPercent >= 0,
    );
  }
}
