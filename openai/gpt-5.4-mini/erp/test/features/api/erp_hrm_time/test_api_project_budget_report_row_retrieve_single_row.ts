import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeProjectBudgetReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProjectBudgetReportRow";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_budget_report_row_retrieve_single_row(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/landing" as string & tags.Format<"uri">,
      ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const row =
    await api.functional.erpHrmTime.member.reports.project_budget_report_rows.at(
      memberConnection,
      {
        projectBudgetReportRowId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(row);
  TestValidator.predicate(
    "organization id should be a uuid value",
    row.organizationId.length > 0,
  );
  TestValidator.predicate(
    "project id should be a uuid value",
    row.projectId.length > 0,
  );
  TestValidator.predicate(
    "budget hours should be non-negative",
    row.budgetHours >= 0,
  );
  TestValidator.predicate(
    "actual hours should be non-negative",
    row.actualHours >= 0,
  );
  TestValidator.predicate(
    "utilization percent should be non-negative",
    row.utilizationPercent >= 0,
  );
  TestValidator.predicate(
    "billable hours should be non-negative",
    row.billableHours >= 0,
  );
  TestValidator.predicate(
    "non-billable hours should be non-negative",
    row.nonBillableHours >= 0,
  );
  TestValidator.predicate(
    "actual hours should match billable plus non-billable hours",
    Math.abs(row.actualHours - (row.billableHours + row.nonBillableHours)) <
      1e-6,
  );
}
