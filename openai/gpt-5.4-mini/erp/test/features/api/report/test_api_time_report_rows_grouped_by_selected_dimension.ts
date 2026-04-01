import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimeReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimeReportRow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTimeReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimeReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";

export async function test_api_time_report_rows_grouped_by_selected_dimension(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const signedIn = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(signedIn);
  const fromDate = new Date(Date.UTC(2026, 2, 23)).toISOString().slice(0, 10);
  const toDate = new Date(Date.UTC(2026, 2, 29)).toISOString().slice(0, 10);
  const employeeGrouped =
    await api.functional.erpHrmTime.member.reports.time_report_rows.index(
      memberConnection,
      {
        body: {
          fromDate,
          toDate,
          groupBy: "employee",
          page: 1,
          limit: 5,
        } satisfies IErpHrmTimeTimeReportRow.IRequest,
      },
    );
  typia.assert(employeeGrouped);
  TestValidator.equals(
    "employee grouped page limit should match request",
    employeeGrouped.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "employee grouped rows should not exceed requested limit",
    employeeGrouped.data.length <= 5,
  );
  TestValidator.predicate(
    "employee grouped pagination current should be positive",
    employeeGrouped.pagination.current >= 1,
  );
  TestValidator.predicate(
    "employee grouped pagination records should be non-negative",
    employeeGrouped.pagination.records >= 0,
  );
  TestValidator.predicate(
    "employee grouped pagination pages should be non-negative",
    employeeGrouped.pagination.pages >= 0,
  );
  const projectGrouped =
    await api.functional.erpHrmTime.member.reports.time_report_rows.index(
      memberConnection,
      {
        body: {
          fromDate,
          toDate,
          groupBy: "project",
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTimeReportRow.IRequest,
      },
    );
  typia.assert(projectGrouped);
  TestValidator.equals(
    "project grouped page limit should match request",
    projectGrouped.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "project grouped rows should not exceed requested limit",
    projectGrouped.data.length <= 10,
  );
  const taskGrouped =
    await api.functional.erpHrmTime.member.reports.time_report_rows.index(
      memberConnection,
      {
        body: {
          fromDate,
          toDate,
          groupBy: "task",
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTimeReportRow.IRequest,
      },
    );
  typia.assert(taskGrouped);
  TestValidator.equals(
    "task grouped page limit should match request",
    taskGrouped.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "task grouped rows should not exceed requested limit",
    taskGrouped.data.length <= 10,
  );
  const billableRows =
    await api.functional.erpHrmTime.member.reports.time_report_rows.index(
      memberConnection,
      {
        body: {
          fromDate,
          toDate,
          groupBy: "employee",
          billable: true,
          page: 1,
          limit: 20,
        } satisfies IErpHrmTimeTimeReportRow.IRequest,
      },
    );
  typia.assert(billableRows);
  const nonBillableRows =
    await api.functional.erpHrmTime.member.reports.time_report_rows.index(
      memberConnection,
      {
        body: {
          fromDate,
          toDate,
          groupBy: "employee",
          billable: false,
          page: 1,
          limit: 20,
        } satisfies IErpHrmTimeTimeReportRow.IRequest,
      },
    );
  typia.assert(nonBillableRows);
  TestValidator.predicate(
    "billable rows page should be valid",
    billableRows.pagination.records >= 0 && billableRows.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "non-billable rows page should be valid",
    nonBillableRows.pagination.records >= 0 &&
      nonBillableRows.pagination.pages >= 0,
  );
  const emptyPage =
    await api.functional.erpHrmTime.member.reports.time_report_rows.index(
      memberConnection,
      {
        body: {
          fromDate: "2099-01-01",
          toDate: "2099-01-07",
          groupBy: "employee",
          page: 1,
          limit: 5,
        } satisfies IErpHrmTimeTimeReportRow.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty filter should return no rows",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter should preserve pagination records",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter should preserve pagination pages",
    emptyPage.pagination.pages,
    0,
  );
}
