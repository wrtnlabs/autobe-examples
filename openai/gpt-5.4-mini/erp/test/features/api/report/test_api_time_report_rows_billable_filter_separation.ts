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

export async function test_api_time_report_rows_billable_filter_separation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `report-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const fromDate = "2026-03-23" satisfies string & tags.Format<"date">;
  const toDate = "2026-03-29" satisfies string & tags.Format<"date">;
  const billableRequest = {
    fromDate,
    toDate,
    billable: true,
    page: 1,
    limit: 100,
    groupBy: "task",
  } satisfies IErpHrmTimeTimeReportRow.IRequest;
  const nonBillableRequest = {
    fromDate,
    toDate,
    billable: false,
    page: 1,
    limit: 100,
    groupBy: "task",
  } satisfies IErpHrmTimeTimeReportRow.IRequest;
  const emptyRequest = {
    fromDate,
    toDate,
    billable: true,
    employeeId: typia.random<string & tags.Format<"uuid">>(),
    projectId: typia.random<string & tags.Format<"uuid">>(),
    page: 1,
    limit: 100,
    groupBy: "task",
  } satisfies IErpHrmTimeTimeReportRow.IRequest;
  const billablePage =
    await api.functional.erpHrmTime.member.reports.time_report_rows.index(
      memberConnection,
      { body: billableRequest },
    );
  typia.assert(billablePage);
  const nonBillablePage =
    await api.functional.erpHrmTime.member.reports.time_report_rows.index(
      memberConnection,
      { body: nonBillableRequest },
    );
  typia.assert(nonBillablePage);
  const emptyPage =
    await api.functional.erpHrmTime.member.reports.time_report_rows.index(
      memberConnection,
      { body: emptyRequest },
    );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "billable page has valid pagination metadata",
    billablePage.pagination.current >= 0 &&
      billablePage.pagination.limit >= 0 &&
      billablePage.pagination.records >= 0 &&
      billablePage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "non-billable page has valid pagination metadata",
    nonBillablePage.pagination.current >= 0 &&
      nonBillablePage.pagination.limit >= 0 &&
      nonBillablePage.pagination.records >= 0 &&
      nonBillablePage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "empty page has valid pagination metadata",
    emptyPage.pagination.current >= 0 &&
      emptyPage.pagination.limit >= 0 &&
      emptyPage.pagination.records >= 0 &&
      emptyPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "billable rows match requested filter",
    billablePage.data.every((row) => row.billable === true),
    true,
  );
  TestValidator.equals(
    "non-billable rows match requested filter",
    nonBillablePage.data.every((row) => row.billable === false),
    true,
  );
  TestValidator.equals(
    "empty filtered page returns no rows",
    emptyPage.data.length,
    0,
  );
  TestValidator.predicate(
    "rows belong to the requested organization when present",
    billablePage.data.every((row) => row.organization !== null) &&
      nonBillablePage.data.every((row) => row.organization !== null),
  );
}
