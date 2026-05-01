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
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test timelog creation with explicit task assignment, validating the
 * task-project consistency rule.
 *
 * Validates that a project-lead can create a task within an active project, then
 * log a timelog referencing both the project and that specific task. The system
 * must accept the request when the task belongs to the same project as the
 * project_id, and the response must include the complete timelog with resolved
 * task and project summaries alongside the session-derived employee identity.
 *
 * 1. Member registers and authenticates via join.
 * 2. A custom role is created for the employee's role assignment.
 * 3. An employee record is created linking the authenticated member to the role.
 * 4. An active project is created to host the task and timelog.
 * 5. The employee is assigned as project-lead on the project.
 * 6. A task is created within the project.
 * 7. A timelog is logged against both the project and the task.
 * 8. Validates that the timelog response includes the correct task, project,
 *    and employee references, confirming the task-project consistency rule.
 */
export async function test_api_timelog_creation_with_task_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a custom role for the employee
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create employee record for the authenticated member
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
  // 4. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign employee as project-lead
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          erp_hrm_employee_id: employee.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 7. Create timelog against both the project and the task
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
      },
    },
  );
  typia.assert(timelog);
  // 8. Validate task-project consistency and response integrity
  TestValidator.predicate(
    "task is populated in timelog response",
    timelog.task !== null,
  );
  TestValidator.equals(
    "task id matches created task",
    timelog.task!.id,
    task.id,
  );
  TestValidator.equals(
    "project id matches submitted project",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "employee derived from authenticated session",
    timelog.employee.id,
    employee.id,
  );
}
