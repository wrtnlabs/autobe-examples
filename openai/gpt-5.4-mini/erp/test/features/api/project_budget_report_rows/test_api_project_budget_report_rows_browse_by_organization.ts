import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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

export async function test_api_project_budget_report_rows_browse_by_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(12)}@example.com` satisfies string &
          tags.Format<"email">,
      password: "password1234" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const organizationConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member.token.access}`,
    },
  };
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const request: IErpHrmTimeProjectBudgetReportRow.IRequest = {
    page: 1,
    limit: 20,
    sort: "+reportDate",
  };
  const firstPage =
    await api.functional.erpHrmTime.member.organizations.projectBudgetReportRows.index(
      organizationConnection,
      {
        organizationId,
        body: request,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.erpHrmTime.member.organizations.projectBudgetReportRows.index(
      organizationConnection,
      {
        organizationId,
        body: request,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "pagination pages are non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page size does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.equals(
    "stable record count",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "stable page count",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  TestValidator.equals(
    "stable row count",
    firstPage.data.length,
    secondPage.data.length,
  );
  for (let i = 0; i < firstPage.data.length; ++i) {
    const row = firstPage.data[i];
    const mirror = secondPage.data[i];
    typia.assert(row);
    typia.assert(mirror);
    TestValidator.equals("stable row id", row.id, mirror.id);
    TestValidator.predicate(
      "budget hours are non-negative",
      row.budgetHours >= 0,
    );
    TestValidator.predicate(
      "actual hours are non-negative",
      row.actualHours >= 0,
    );
    TestValidator.predicate(
      "utilization percent is non-negative",
      row.utilizationPercent >= 0,
    );
    TestValidator.predicate(
      "billable hours are non-negative",
      row.billableHours >= 0,
    );
    TestValidator.predicate(
      "non billable hours are non-negative",
      row.nonBillableHours >= 0,
    );
    TestValidator.predicate(
      "period start is before or equal to period end",
      row.periodStartDate <= row.periodEndDate,
    );
    TestValidator.predicate(
      "has related project summary",
      row.project !== null && row.project !== undefined,
    );
    TestValidator.predicate(
      "project belongs to selected organization when summary exists",
      row.project.organization !== null &&
        row.project.organization !== undefined
        ? row.project.organization.id === organizationId
        : true,
    );
  }
  const narrowProjectId = firstPage.data[0]?.project.id;
  if (narrowProjectId !== undefined) {
    const narrowedPage =
      await api.functional.erpHrmTime.member.organizations.projectBudgetReportRows.index(
        organizationConnection,
        {
          organizationId,
          body: {
            page: 1,
            limit: 10,
            sort: "-reportDate",
            projectId: narrowProjectId,
            reportDateFrom: firstPage.data[0].periodStartDate,
            reportDateTo: firstPage.data[0].periodEndDate,
          } satisfies IErpHrmTimeProjectBudgetReportRow.IRequest,
        },
      );
    typia.assert(narrowedPage);
    TestValidator.predicate(
      "narrowed page limit is positive",
      narrowedPage.pagination.limit > 0,
    );
    TestValidator.predicate(
      "narrowed page size does not exceed limit",
      narrowedPage.data.length <= narrowedPage.pagination.limit,
    );
    for (const row of narrowedPage.data) {
      typia.assert(row);
      TestValidator.equals(
        "narrowed rows match requested project",
        row.project.id,
        narrowProjectId,
      );
      TestValidator.predicate(
        "narrowed rows stay within organization when summary exists",
        row.project.organization !== null &&
          row.project.organization !== undefined
          ? row.project.organization.id === organizationId
          : true,
      );
    }
  }
}
