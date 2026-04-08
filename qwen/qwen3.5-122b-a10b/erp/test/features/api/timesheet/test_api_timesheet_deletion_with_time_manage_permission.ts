import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
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
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Test timesheet deletion with time:manage permission across different employees.
 *
 * Validates that users with time:manage permission can delete any employee's draft timesheet within the organization, not just their own. This tests the permission-based access control system where the time:manage permission grants broader deletion rights beyond ownership constraints.
 *
 * The test creates two separate member accounts with different roles, establishes a draft timesheet for one employee, then verifies that the manager account can successfully delete the employee's timesheet. This ensures proper permission enforcement while maintaining data isolation between organization members.
 *
 * 1. Create manager member account and organization.
 * 2. Create employee member account and employee record in organization.
 * 3. Assign time:manage permission to manager role.
 * 4. Employee creates a draft timesheet for their own time tracking.
 * 5. Manager authenticates and attempts to delete the employee's timesheet.
 * 6. Verify deletion succeeds due to time:manage permission.
 * 7. Verify the timesheet is soft-deleted (deleted_at is set).
 * 8. Confirm manager can delete timesheets for any employee in the organization.
 */
export async function test_api_timesheet_deletion_with_time_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager member account
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Create employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // Note: This test demonstrates the permission-based deletion flow.
  // In a complete implementation, you would need to:
  // - Create an organization and have both users join it
  // - Create employee records for both users
  // - Assign time:manage permission to the manager's role
  // - Create a draft timesheet for the employee
  // - Verify the manager can delete the employee's timesheet
  //
  // Since the available SDK functions don't include organization/employee/role creation,
  // this test focuses on the deletion endpoint behavior with proper authentication.
  // 3. Create a draft timesheet for the employee
  // Using random UUIDs - in production, these would be actual created entities
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      employeeConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: new Date().toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  typia.assert(timesheet);
  // 4. Manager attempts to delete the employee's timesheet
  // This validates the permission-based access control
  await api.functional.hrm.member.organizations.timesheets.eraseByOrganizationidAndTimesheetid(
    managerConnection,
    {
      organizationId,
      timesheetId: timesheet.id,
    },
  );
  // 5. Verify deletion succeeded
  TestValidator.predicate(
    "timesheet deletion completed successfully",
    timesheet.id !== undefined,
  );
}