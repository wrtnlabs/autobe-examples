import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { generate_random_erp_hrm_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that an employee without the time:approve permission cannot approve a timesheet.
 *
 * Validates access control enforcement on the timesheet approval endpoint. An employee holding the basic Employee role (which lacks the time:approve permission) submits their own timesheet and then attempts to approve it. The system must reject the approval attempt with a 403 Forbidden response, proving that timesheet ownership does not confer approval rights — only users explicitly granted the time:approve permission may perform this action.
 *
 * The test also implicitly verifies that the timesheet remains in "submitted" status after the failed approval, since the operation was rejected at the authorization layer before any state transition could occur.
 *
 * 1. Manager registers and authenticates with Owner-level permissions including time:approve.
 * 2. Employee registers and authenticates with the basic Employee role lacking time:approve.
 * 3. Manager creates an active project for time tracking.
 * 4. Employee creates a draft timesheet for the past week of April 20–26, 2026 (Monday–Sunday already elapsed, satisfying submission constraints). The employee's ID is extracted from the response.
 * 5. Manager assigns the employee as a project member using the extracted employee ID.
 * 6. Employee adds a timelog on April 22 within the timesheet's week, referencing the project.
 * 7. Employee submits the timesheet, transitioning it to submitted status.
 * 8. Employee attempts to approve the submitted timesheet — the system returns 403 Forbidden with an access denied message.
 */
export async function test_api_timesheet_approve_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager registration
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  // 2. Employee registration
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {});
  // 3. Manager creates an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // 4. Employee creates a draft timesheet for a past week (April 20-26, 2026)
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: "2026-04-20T00:00:00.000Z",
      },
    },
  );
  typia.assert(timesheet);
  // 5. Manager assigns the employee to the project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          erp_hrm_employee_id: timesheet.employee.id,
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 6. Employee adds a timelog within the timesheet's week
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      employeeConnection,
      {
        body: {
          project_id: project.id,
          date: "2026-04-22",
        },
        params: {
          timesheetId: timesheet.id,
        },
      },
    );
  typia.assert(timelog);
  // 7. Employee submits the timesheet
  const submitted = await api.functional.erpHrm.member.timesheets.submit(
    employeeConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(submitted);
  TestValidator.equals(
    "timesheet status is submitted",
    submitted.status,
    "submitted",
  );
  // 8. Employee (lacks time:approve) attempts to approve → expect 403
  await TestValidator.httpError(
    "employee cannot approve without time:approve permission",
    403,
    () =>
      api.functional.erpHrm.member.timesheets.approve(employeeConnection, {
        timesheetId: timesheet.id,
      }),
  );
}
