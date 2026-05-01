import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { generate_random_erp_hrm_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_timelogs_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that an employee cannot delete their own timelog after the enclosing timesheet has been submitted.
 *
 * Validates the timesheet workflow constraint that timelogs grouped into a submitted timesheet are locked from deletion by the owning employee. The employee lacks the `time:manage` permission, so once the timesheet transitions from draft to submitted status, all contained timelogs become protected from owner-initiated deletion. This ensures data integrity during the review process — timelogs under review cannot be silently removed.
 *
 * The test constructs the full prerequisite chain: organization creation, role assignment, employee onboarding, project setup, project membership, timesheet creation, timelog logging, and timesheet submission. The deletion attempt is then verified to fail, confirming the submitted-timesheet lock is enforced for non-privileged users.
 *
 * 1. Owner member joins the platform and creates an organization.
 * 2. Owner creates a custom role without the `time:manage` permission.
 * 3. A second member joins as the future employee.
 * 4. Owner creates an employee record for the second member with the custom role.
 * 5. Owner creates an active project for time tracking.
 * 6. Owner adds the employee as a project member.
 * 7. Employee creates a draft timesheet for a work week.
 * 8. Employee logs a timelog against the project within the draft timesheet.
 * 9. Employee submits the timesheet, transitioning it to submitted status.
 * 10. Employee attempts to delete the timelog and receives a rejection error.
 */
export async function test_api_timelog_delete_blocked_in_submitted_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner member joins
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a custom role
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Employee member joins
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  typia.assert(employee);
  // 4. Owner creates employee record for the Employee member
  const employeeRecord = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: employee.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employeeRecord);
  // 5. Owner creates an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 6. Owner adds Employee as a project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: { erp_hrm_employee_id: employeeRecord.id },
      },
    );
  typia.assert(projectMember);
  // 7. Employee creates a draft timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {},
  );
  typia.assert(timesheet);
  // 8. Employee logs a timelog within the draft timesheet
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      employeeConnection,
      {
        params: { timesheetId: timesheet.id },
        body: { project_id: project.id },
      },
    );
  typia.assert(timelog);
  // 9. Employee submits the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // 10. Employee attempts to delete the timelog — must fail
  await TestValidator.error(
    "timelog cannot be deleted after timesheet is submitted",
    async () => {
      await api.functional.erpHrm.member.timelogs.erase(employeeConnection, {
        timelogId: timelog.id,
      });
    },
  );
}
