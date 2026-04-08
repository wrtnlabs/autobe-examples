import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeWeeklySummaryReportRow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeWeeklySummaryReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeWeeklySummaryReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_weekly_summary_report_rows_list_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/onboard",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const weekStart = new Date();
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekStartFrom = new Date(weekStart);
  weekStartFrom.setUTCDate(weekStartFrom.getUTCDate() - 28);
  const weekStartTo = new Date(weekStart);
  weekStartTo.setUTCDate(weekStartTo.getUTCDate() + 28);
  const output =
    await api.functional.erpHrmTime.member.organizations.weeklySummaryReportRows.index(
      authorizedConnection,
      {
        organizationId,
        body: {
          weekStartDateFrom: weekStartFrom.toISOString(),
          weekStartDateTo: weekStartTo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IErpHrmTimeWeeklySummaryReportRow.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page matches request",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    output.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned rows do not exceed requested limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "all rows are scoped to the requested organization",
    output.data.every((row) => row.organization.id === organizationId),
  );
  TestValidator.predicate(
    "all rows are active by default",
    output.data.every((row) => row.deletedAt === null),
  );
  TestValidator.predicate(
    "rows are sorted by weekStartDate ascending by default",
    output.data.every(
      (row, index, array) =>
        index === 0 || array[index - 1].weekStartDate <= row.weekStartDate,
    ),
  );
  TestValidator.predicate(
    "each row has consistent week boundaries and non-negative aggregates",
    output.data.every(
      (row) =>
        row.weekStartDate <= row.weekEndDate &&
        row.totalHours >= 0 &&
        row.timelogCount >= 0 &&
        row.activeEmployeeCount >= 0,
    ),
  );
}
