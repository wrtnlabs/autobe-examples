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
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test timelog project reassignment workflow.
 *
 * Validates that a timelog can be updated to reassign its project reference
 * from one active project to another, provided the employee is an active
 * member of both projects. This verifies the project membership validation
 * during timelog updates and ensures time entries can be correctly moved
 * between projects the employee participates in.
 *
 * 1. Member authenticates via join and obtains JWT access token.
 * 2. Custom role is created for the employee in the organization.
 * 3. Employee record is created linking the member to the role.
 * 4. First active project is created.
 * 5. Employee is assigned as a member of the first project.
 * 6. Second active project is created.
 * 7. Employee is assigned as a member of the second project.
 * 8. A timelog is created against the first project with a task cleared.
 * 9. The timelog is updated to reassign it to the second project, clearing
 *    any task association to avoid cross-project task conflicts.
 * 10. Validates the updated timelog references the second project, the
 *     original timelog identifier is preserved, and the project has changed
 *     from the first to the second.
 */
export async function test_api_timelog_update_project_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a custom role
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {
    body: {},
  });
  typia.assert(role);
  // 3. Create employee record for the member
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        email: member.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create first active project
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(project1);
  // 5. Assign employee to first project
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: { erp_hrm_employee_id: employee.id },
    },
  );
  // 6. Create second active project
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(project2);
  // 7. Assign employee to second project
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: { erp_hrm_employee_id: employee.id },
    },
  );
  // 8. Create timelog against first project
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    { body: { project_id: project1.id } },
  );
  typia.assert(timelog);
  // 9. Update timelog to reassign to second project, clear task
  const updated = await api.functional.erpHrm.member.timelogs.update(
    memberConnection,
    {
      timelogId: timelog.id,
      body: {
        date: timelog.date,
        duration_minutes: timelog.duration_minutes,
        project_id: project2.id,
        task_id: null,
        billable: timelog.billable,
      } satisfies IErpHrmTimelog.IUpdate,
    },
  );
  typia.assert(updated);
  // 10. Validate reassignment
  TestValidator.equals(
    "project reassigned to second project",
    updated.project.id,
    project2.id,
  );
  TestValidator.notEquals(
    "project no longer first project",
    updated.project.id,
    project1.id,
  );
  TestValidator.equals(
    "timelog id preserved through update",
    updated.id,
    timelog.id,
  );
}
