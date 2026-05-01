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
 * Test that deleting a timelog is blocked when its parent timesheet has been approved.
 *
 * Validates the strongest constraint in the timelog deletion flow: once a timesheet is approved,
 * all contained timelogs become permanently locked and cannot be deleted by anyone — not even
 * the timelog owner themselves. The approved-timesheet lock is absolute and applies to all
 * users regardless of permission level.
 *
 * 1. Member joins the platform with random credentials.
 * 2. Creates a custom role for the organization.
 * 3. Creates an employee record for themselves with the custom role.
 * 4. Creates an active project for time tracking.
 * 5. Adds the employee as a project member so they can log time.
 * 6. Creates a draft timesheet for the previous Monday-to-Sunday week.
 * 7. Adds a timelog to the draft timesheet against the project.
 * 8. Submits the timesheet, transitioning it from draft to submitted.
 * 9. Approves the submitted timesheet, permanently locking all timelogs.
 * 10. Attempts to delete the timelog — expects a 409/422 rejection.
 */
export async function test_api_timelog_delete_blocked_in_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a role
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create an employee record
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    { body: { erp_hrm_role_id: role.id, email: member.email } },
  );
  typia.assert(employee);
  // 4. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Add employee as project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { erp_hrm_employee_id: employee.id },
      },
    );
  typia.assert(projectMember);
  // 6. Compute a past Monday for the timesheet week (previous week)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const pastMonday = new Date(now);
  pastMonday.setDate(now.getDate() - daysSinceMonday - 7);
  pastMonday.setHours(0, 0, 0, 0);
  const mondayStr = pastMonday.toISOString();
  const mondayDateStr = pastMonday.toISOString().split("T")[0];
  // 7. Create draft timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    { body: { week_start_date: mondayStr } },
  );
  typia.assert(timesheet);
  // 8. Add a timelog to the draft timesheet
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      memberConnection,
      {
        params: { timesheetId: timesheet.id },
        body: { project_id: project.id, date: mondayDateStr },
      },
    );
  typia.assert(timelog);
  // 9. Submit the timesheet
  const submitted = await api.functional.erpHrm.member.timesheets.submit(
    memberConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(submitted);
  // 10. Approve the timesheet — locks all timelogs permanently
  const approved = await api.functional.erpHrm.member.timesheets.approve(
    memberConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(approved);
  TestValidator.equals("timesheet is approved", approved.status, "approved");
  // 11. Attempt to delete the locked timelog — must be rejected
  await TestValidator.httpError(
    "cannot delete timelog in approved timesheet",
    [409, 422],
    async () => {
      await api.functional.erpHrm.member.timelogs.erase(memberConnection, {
        timelogId: timelog.id,
      });
    },
  );
}
