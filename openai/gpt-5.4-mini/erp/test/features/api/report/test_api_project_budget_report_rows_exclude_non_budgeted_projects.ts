import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectBudgetReportRow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProjectBudgetReportRow";
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

export async function test_api_project_budget_report_rows_exclude_non_budgeted_projects(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `Org ${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const request = {
    page: 1,
    limit: 100,
    sort: "+id",
  } satisfies IErpHrmTimeProjectBudgetReportRow.IRequest;
  const first =
    await api.functional.erpHrmTime.member.reports.project_budget_report_rows.index(
      memberConnection,
      { body: request },
    );
  typia.assert(first);
  const second =
    await api.functional.erpHrmTime.member.reports.project_budget_report_rows.index(
      memberConnection,
      { body: request },
    );
  typia.assert(second);
  TestValidator.equals(
    "stable pagination metadata",
    first.pagination,
    second.pagination,
  );
  TestValidator.equals("stable report rows", first.data, second.data);
  TestValidator.predicate(
    "report excludes non-budgeted projects",
    first.data.every((row) => row.budgetHours > 0),
  );
  TestValidator.predicate(
    "report rows have non-negative actual and component hours",
    first.data.every(
      (row) =>
        row.actualHours >= 0 &&
        row.billableHours >= 0 &&
        row.nonBillableHours >= 0,
    ),
  );
  TestValidator.predicate(
    "utilization is a finite non-negative number",
    first.data.every(
      (row) =>
        Number.isFinite(row.utilizationPercent) && row.utilizationPercent >= 0,
    ),
  );
}
