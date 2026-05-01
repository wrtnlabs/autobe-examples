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
 * Test weekly summary report retrieval and data aggregation structure.
 *
 * Validates that the weekly summary report endpoint returns correctly structured aggregated data across ISO weeks. The test authenticates as a new member with report access, retrieves the report, and verifies both the structural integrity and business logic constraints of the response.
 *
 * 1. Authenticate a new member via join to obtain access credentials.
 * 2. Retrieve the weekly summary report from the authenticated endpoint.
 * 3. Validate with typia.assert that the response conforms to IErpHrmWeeklySummaryReport — confirming all required fields (weeks, weekStartDate, weekEndDate, totalHours, billableHours, nonBillableHours, totalTimelogs, projectBreakdown, employeeBreakdown) are present and correctly typed. Privacy is enforced by the DTO types excluding individual timelog descriptions.
 * 4. Verify weeks are sorted chronologically by weekStartDate ascending.
 * 5. Verify all hour values are rounded to at most 2 decimal places.
 * 6. Verify nonBillableHours arithmetic consistency (totalHours − billableHours) for each week and each project breakdown.
 * 7. Verify employee breakdown names are non-empty.
 */
export async function test_api_weekly_summary_report_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Retrieve the weekly summary report
  const report =
    await api.functional.erpHrm.member.reports.weekly_summary.at(
      memberConnection,
    );
  typia.assert(report);
  // 3. Validate weeks are sorted chronologically by weekStartDate ascending
  if (report.weeks.length > 1) {
    TestValidator.predicate("weeks sorted chronologically", () => {
      for (let i = 1; i < report.weeks.length; i++) {
        if (report.weeks[i].weekStartDate < report.weeks[i - 1].weekStartDate) {
          return false;
        }
      }
      return true;
    });
  }
  // Helper to check at most 2 decimal places
  const hasTwoDecimals = (n: number): boolean => {
    const parts = n.toString().split(".");
    return parts.length === 1 || parts[1].length <= 2;
  };
  // 4. Validate each week entry
  for (const week of report.weeks) {
    // Validate nonBillableHours = totalHours - billableHours
    TestValidator.predicate(
      "nonBillableHours equals totalHours minus billableHours",
      Math.abs(week.nonBillableHours - (week.totalHours - week.billableHours)) <
        0.01,
    );
    // Validate hour values rounded to 2 decimal places
    TestValidator.predicate(
      "totalHours rounded to 2 decimal places",
      hasTwoDecimals(week.totalHours),
    );
    TestValidator.predicate(
      "billableHours rounded to 2 decimal places",
      hasTwoDecimals(week.billableHours),
    );
    TestValidator.predicate(
      "nonBillableHours rounded to 2 decimal places",
      hasTwoDecimals(week.nonBillableHours),
    );
    // Validate project breakdown entries
    for (const project of week.projectBreakdown) {
      TestValidator.predicate(
        "project nonBillableHours equals totalHours minus billableHours",
        Math.abs(
          project.nonBillableHours -
            (project.totalHours - project.billableHours),
        ) < 0.01,
      );
      TestValidator.predicate(
        "project totalHours rounded to 2 decimal places",
        hasTwoDecimals(project.totalHours),
      );
    }
    // Validate employee breakdown entries
    for (const employee of week.employeeBreakdown) {
      TestValidator.predicate(
        "employee name is non-empty",
        employee.employeeName.length > 0,
      );
    }
  }
}
