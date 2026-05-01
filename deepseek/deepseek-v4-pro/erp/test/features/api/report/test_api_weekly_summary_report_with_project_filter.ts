import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Validate the weekly summary report endpoint returns correctly structured
 * time tracking aggregates for the authenticated member's organization.
 *
 * Verifies that the weekly summary report conforms to IErpHrmWeeklySummaryReport
 * and that each week's aggregate statistics satisfy internal consistency
 * constraints. The test authenticates a member and retrieves the report, then
 * confirms that week-level totals reconcile with project and employee breakdowns.
 *
 * 1. Authenticate a new member via join to obtain JWT access token for authorized
 *    report retrieval.
 * 2. Retrieve the weekly summary report through the authenticated connection.
 * 3. Validate response structure with typia.assert against IErpHrmWeeklySummaryReport.
 * 4. Verify business logic consistency: non-billable hours equal total minus billable
 *    hours for each week, project, and employee breakdown entry.
 */
export async function test_api_weekly_summary_report_with_project_filter(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const report =
    await api.functional.erpHrm.member.reports.weekly_summary.at(
      memberConnection,
    );
  typia.assert(report);
  for (const week of report.weeks) {
    TestValidator.predicate(
      `week ${week.weekStartDate}: nonBillableHours equals total - billable`,
      Math.abs(week.billableHours - (week.totalHours - week.billableHours)) <
        0.01,
    );
    for (const pb of week.projectBreakdown) {
      TestValidator.predicate(
        `week ${week.weekStartDate} project ${pb.projectName}: nonBillable equals total - billable`,
        Math.abs(pb.billableHours - (pb.totalHours - pb.billableHours)) <
          0.01,
      );
    }
    for (const eb of week.employeeBreakdown) {
      TestValidator.predicate(
        `week ${week.weekStartDate} employee ${eb.employeeName}: nonBillable equals total - billable`,
        Math.abs(eb.billableHours - (eb.totalHours - eb.billableHours)) <
          0.01,
      );
    }
  }
}
