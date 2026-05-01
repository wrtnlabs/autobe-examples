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
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Test that stopping a running timer creates a timelog with correct data.
 *
 * Validates the complete timer-to-timelog lifecycle: an employee starts a live timer against a project they belong to, then stops it. The resulting timelog must carry over the project, task, and description from the timer at the moment of stopping, have billable defaulting to true, have a date set to the current day, have a positive duration representing the elapsed time, and have a null timesheet_id.
 *
 * After the timelog is created, the timer is permanently deleted, freeing the employee to start a new timer without a 409 Conflict.
 *
 * 1. Owner signs up and creates a role.
 * 2. Employee signs up as a separate member and is added to the organization by the owner.
 * 3. Owner creates a project and assigns the employee as a project member.
 * 4. Employee starts a live timer against the project with a known description.
 * 5. Employee stops the timer and validates all timelog properties.
 * 6. Verifies the timer is deleted by starting another timer without conflict.
 */
export async function test_api_timer_stop_creates_timelog_with_correct_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner sign up
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Employee sign up
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  // 3. Owner creates role
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  // 4. Owner creates employee record matching the employee's email
  const employeeRecord = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    { body: { email: employee.email, erp_hrm_role_id: role.id } },
  );
  // 5. Owner creates project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  // 6. Owner assigns employee as project member
  await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      body: { erp_hrm_employee_id: employeeRecord.id },
      params: { projectId: project.id },
    },
  );
  // 7. Employee starts timer with a known description and no task
  const timerDescription = "Implementing the timer stop feature";
  const timer = await generate_random_erp_hrm_member_timers_create(
    employeeConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        erp_hrm_task_id: null,
        description: timerDescription,
      },
    },
  );
  // 8. Employee stops the running timer
  const timelog = await api.functional.erpHrm.member.timers.stop(
    employeeConnection,
    { timerId: timer.id },
  );
  typia.assert(timelog);
  // 9. Validate timelog properties carried over from timer
  TestValidator.equals("project carried over", timelog.project.id, project.id);
  TestValidator.equals(
    "description carried over",
    timelog.description,
    timerDescription,
  );
  TestValidator.equals("task carried over", timelog.task, timer.task);
  TestValidator.equals("billable defaults to true", timelog.billable, true);
  TestValidator.equals("timesheet_id is null", timelog.timesheet, null);
  TestValidator.predicate("duration is positive", timelog.duration_minutes > 0);
  // Validate date is today
  const today = new Date().toISOString().substring(0, 10);
  TestValidator.predicate("date is today", timelog.date.startsWith(today));
  // 10. Verify timer is deleted — can start another timer without conflict
  const newTimer = await generate_random_erp_hrm_member_timers_create(
    employeeConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        erp_hrm_task_id: null,
      },
    },
  );
  typia.assert(newTimer);
}
