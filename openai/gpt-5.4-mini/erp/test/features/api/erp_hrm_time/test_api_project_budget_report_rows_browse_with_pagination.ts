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

export async function test_api_project_budget_report_rows_browse_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const organization =
    await generate_random_erp_hrm_time_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `Budget Report ${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  const request = {
    page: 1,
    limit: 10,
    sort: "-actualHours",
  } satisfies IErpHrmTimeProjectBudgetReportRow.IRequest;
  const first =
    await api.functional.erpHrmTime.member.reports.project_budget_report_rows.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(first);
  const secondRequest = {
    page: 1,
    limit: 10,
    sort: "-actualHours",
  } satisfies IErpHrmTimeProjectBudgetReportRow.IRequest;
  const second =
    await api.functional.erpHrmTime.member.reports.project_budget_report_rows.index(
      memberConnection,
      {
        body: secondRequest,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination current",
    first.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    first.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination consistency",
    first.pagination.limit === 0
      ? first.pagination.pages === 0
      : first.pagination.pages >=
          Math.ceil(first.pagination.records / first.pagination.limit),
  );
  TestValidator.predicate(
    "rows fit page limit",
    first.data.length <= first.pagination.limit,
  );
  TestValidator.predicate(
    "all rows have budgeted projects",
    first.data.every((row) => row.budgetHours !== null),
  );
  TestValidator.predicate(
    "all rows preserve organization scoping",
    first.data.every(
      (row) => row.organization !== null && row.project !== null,
    ),
  );
  TestValidator.equals("repeated reads are stable", first, second);
  typia.assert(member);
  typia.assert(organization);
}
