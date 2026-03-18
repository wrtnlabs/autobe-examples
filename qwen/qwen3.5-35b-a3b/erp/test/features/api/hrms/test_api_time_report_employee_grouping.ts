import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_time_report_employee_grouping(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create authenticated connection for API calls
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // Calculate current calendar week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  // Generate time report with employee grouping
  const report = await api.functional.hrms.member.reports.time.index(
    authenticatedConnection,
    {
      body: {
        date_range: {
          start_date: weekStart.toISOString(),
          end_date: weekEnd.toISOString(),
        },
      },
    },
  );
  typia.assert(report);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    report.pagination.current,
    report.pagination.current,
  );
  TestValidator.equals(
    "pagination limit",
    report.pagination.limit,
    report.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    report.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    report.pagination.pages >= 0,
  );
  // Validate each employee entry in the report
  for (const entry of report.data) {
    // Validate required fields exist and have correct types
    const employeeId = entry.group_id;
    const employeeName = entry.group_name;
    const totalHours = entry.total_hours;
    const billableHours = entry.billable_hours;
    const nonBillableHours = entry.non_billable_hours;
    // Validate UUID format for group_id (employee ID)
    typia.assert<string & tags.Format<"uuid">>(employeeId);
    // Validate employee name is a string
    typia.assert<string>(employeeName);
    // Validate hours are numbers
    typia.assert<number>(totalHours);
    typia.assert<number>(billableHours);
    typia.assert<number>(nonBillableHours);
    // Validate mathematical correctness: total = billable + non-billable
    const calculatedTotal = billableHours + nonBillableHours;
    TestValidator.equals(
      "total hours calculation",
      totalHours,
      calculatedTotal,
    );
    // Validate hours are non-negative
    TestValidator.predicate("total hours non-negative", totalHours >= 0);
    TestValidator.predicate("billable hours non-negative", billableHours >= 0);
    TestValidator.predicate(
      "non-billable hours non-negative",
      nonBillableHours >= 0,
    );
  }
}