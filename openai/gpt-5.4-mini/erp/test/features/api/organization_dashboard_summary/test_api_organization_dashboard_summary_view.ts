import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_dashboard_summary_view(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!abcd" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/" as string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const summary =
    await api.functional.erpHrmTime.member.reports.organization_dashboard_summaries.at(
      memberConnection,
      {
        organizationDashboardSummaryId: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    );
  typia.assert(summary);
  TestValidator.predicate(
    "snapshot date is valid",
    summary.snapshotDate.length > 0,
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
    "budget utilization over 80 count is non-negative",
    summary.budgetUtilizationOver80Count >= 0,
  );
  TestValidator.equals(
    "top project id nullable preserved",
    summary.topProjectId,
    summary.topProjectId ?? null,
  );
  TestValidator.equals(
    "top project budget hours nullable preserved",
    summary.topProjectBudgetHours,
    summary.topProjectBudgetHours ?? null,
  );
  TestValidator.equals(
    "top project actual hours nullable preserved",
    summary.topProjectActualHours,
    summary.topProjectActualHours ?? null,
  );
  TestValidator.equals(
    "top project budget utilization nullable preserved",
    summary.topProjectBudgetUtilizationPercent,
    summary.topProjectBudgetUtilizationPercent ?? null,
  );
}
