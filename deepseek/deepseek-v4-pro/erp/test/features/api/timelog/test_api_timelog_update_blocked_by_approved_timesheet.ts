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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { generate_random_erp_hrm_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_timelogs_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timelog_update_blocked_by_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // Compute Monday of the current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  const mondayStr = monday.toISOString();
  const timelogDate = monday.toISOString().split("T")[0];
  // 1. Owner joins
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    },
  });
  // 2. Owner creates custom role
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Employee joins
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
    },
  });
  // 4. Owner invites employee into organization
  const employeeRecord = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: employeeEmail,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employeeRecord);
  // 5. Owner creates project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 6. Owner assigns employee to project
  await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      body: { erp_hrm_employee_id: employeeRecord.id },
      params: { projectId: project.id },
    },
  );
  // 7. Employee creates timelog
  const timelogBody = {
    project_id: project.id,
    date: timelogDate,
    duration_minutes: 60,
  } satisfies DeepPartial<IErpHrmTimelog.ICreate>;
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    { body: timelogBody },
  );
  typia.assert(timelog);
  // 8. Employee creates draft timesheet for the week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: { week_start_date: mondayStr },
    },
  );
  typia.assert(timesheet);
  // 9. Employee adds another timelog to the draft timesheet
  const timesheetTimelogBody = {
    project_id: project.id,
    date: timelogDate,
    duration_minutes: 30,
  } satisfies DeepPartial<IErpHrmTimelog.ICreate>;
  const timesheetTimelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      employeeConnection,
      {
        body: timesheetTimelogBody,
        params: { timesheetId: timesheet.id },
      },
    );
  typia.assert(timesheetTimelog);
  // 10. Employee submits timesheet
  const submitted = await api.functional.erpHrm.member.timesheets.submit(
    employeeConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(submitted);
  // 11. Owner approves timesheet
  const approved = await api.functional.erpHrm.member.timesheets.approve(
    ownerConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(approved);
  // 12. Employee attempts to update the locked timelog
  await TestValidator.error(
    "update blocked by approved timesheet",
    async () => {
      await api.functional.erpHrm.member.timelogs.update(employeeConnection, {
        timelogId: timelog.id,
        body: {
          date: mondayStr,
          duration_minutes: 120,
          project_id: project.id,
          billable: true,
        } satisfies IErpHrmTimelog.IUpdate,
      });
    },
  );
}
