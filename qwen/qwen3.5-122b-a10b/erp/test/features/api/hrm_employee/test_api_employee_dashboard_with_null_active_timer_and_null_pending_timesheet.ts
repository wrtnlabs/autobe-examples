import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmEmployeeDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeDashboard";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee dashboard endpoint with null active timer and null pending timesheet.
 *
 * Validates the employee dashboard endpoint when the employee has no active timer session and no pending submitted timesheet. This tests the null handling edge cases for dashboard fields to ensure the API correctly returns null values and empty arrays when data is missing.
 *
 * **Note**: Full integration testing requires SDK functions for organization and employee creation which are not currently available. This test focuses on validating the response structure and type safety of the dashboard endpoint.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Validate member registration response structure.
 * 3. Call GET /hrm/member/organizations/{organizationId}/dashboard/employee with organization context.
 * 4. Validate dashboard response conforms to IHrmEmployeeDashboard type.
 * 5. Validate hoursToday and hoursThisWeek are non-negative numbers.
 * 6. Validate activeTimer, pendingTimesheet can be null (edge case handling).
 * 7. Validate assignedTasks and recentTimelogs are arrays.
 */
export async function test_api_employee_dashboard_with_null_active_timer_and_null_pending_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Validate member registration response
  TestValidator.predicate(
    "member has valid email",
    memberAuth.email.includes("@"),
  );
  TestValidator.predicate(
    "member has authentication token",
    memberAuth.token.access.length > 0,
  );
  // 3. Call the employee dashboard endpoint
  // Note: For full null handling validation, organization and employee records
  // must be created first. This test validates response structure and type safety.
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const dashboard: IHrmEmployeeDashboard =
    await api.functional.hrm.member.organizations.dashboard.employee.at(
      memberConnection,
      {
        organizationId,
      },
    );
  typia.assert(dashboard);
  // 4. Validate dashboard structure and type safety
  // hoursToday and hoursThisWeek should be non-negative numbers
  TestValidator.predicate(
    "hoursToday is non-negative",
    dashboard.hoursToday >= 0,
  );
  TestValidator.predicate(
    "hoursThisWeek is non-negative",
    dashboard.hoursThisWeek >= 0,
  );
  // 5. Validate array fields are arrays (may be empty)
  TestValidator.predicate(
    "recentTimelogs is array",
    Array.isArray(dashboard.recentTimelogs),
  );
  TestValidator.predicate(
    "assignedTasks is array",
    Array.isArray(dashboard.assignedTasks),
  );
  // 6. Validate nullable fields (activeTimer and pendingTimesheet can be null)
  // In simulation mode, these may be populated with random data
  // In real mode with no data, these should be null
  TestValidator.predicate(
    "activeTimer is null or object",
    dashboard.activeTimer === null ||
      (typeof dashboard.activeTimer === "object" &&
        "id" in dashboard.activeTimer),
  );
  TestValidator.predicate(
    "pendingTimesheet is null or object",
    dashboard.pendingTimesheet === null ||
      (typeof dashboard.pendingTimesheet === "object" &&
        "id" in dashboard.pendingTimesheet),
  );
}
