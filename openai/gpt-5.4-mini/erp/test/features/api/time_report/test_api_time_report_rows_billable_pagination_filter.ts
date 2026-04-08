import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
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

export async function test_api_time_report_rows_billable_pagination_filter(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${typia.random<string & tags.Format<"email">>()}`,
      password: "Test1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const reportRequest: IErpHrmTimeTimeReportRow.IRequest = {
    billable: true,
    page: 1,
    limit: 2,
  };
  const organizationId = authorized.id;
  const firstPage =
    await api.functional.erpHrmTime.member.organizations.timeReportRows.index(
      memberConnection,
      {
        organizationId,
        body: reportRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page limit should match the requested limit",
    firstPage.pagination.limit,
    reportRequest.limit,
  );
  TestValidator.equals(
    "first page current should match the requested page",
    firstPage.pagination.current,
    reportRequest.page,
  );
  TestValidator.predicate(
    "first page rows should all be billable",
    firstPage.data.every((row) => row.billable === true),
  );
  TestValidator.predicate(
    "first page should contain only valid report rows",
    firstPage.data.every(
      (row) => row.deletedAt === null || row.deletedAt !== undefined,
    ),
  );
  const secondPage =
    await api.functional.erpHrmTime.member.organizations.timeReportRows.index(
      memberConnection,
      {
        organizationId,
        body: {
          ...reportRequest,
          page: 2,
        },
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "billable filter should not change total records between pages",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "billable filter should not change total pages between pages",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals(
    "second page limit should remain stable",
    secondPage.pagination.limit,
    firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "second page rows should all be billable",
    secondPage.data.every((row) => row.billable === true),
  );
  TestValidator.predicate(
    "page navigation should advance to the next page when results exist",
    secondPage.pagination.current === 2 || secondPage.data.length === 0,
  );
  TestValidator.predicate(
    "report rows should not unexpectedly repeat the first row across pages when both pages have data",
    firstPage.data.length === 0 || secondPage.data.length === 0
      ? true
      : firstPage.data[0].id !== secondPage.data[0].id,
  );
}
