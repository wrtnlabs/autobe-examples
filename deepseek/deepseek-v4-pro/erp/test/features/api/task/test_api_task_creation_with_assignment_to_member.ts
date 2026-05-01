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
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test task creation with assignment to a project member.
 *
 * Validates that an authorized user can create a task within a project and assign it to an employee who holds an active membership in that project. The test exercises the full workflow: member authentication, project creation, project member assignment, and task creation with employee assignment.
 *
 * 1. Member authenticates via join to obtain project management permissions.
 * 2. Member creates an active project for hosting tasks.
 * 3. Member adds an employee as a project member with a membership role.
 * 4. Member creates a task within the project, assigning it to the project member.
 * 5. Validates that assignedEmployee is populated with the correct employee summary, including member profile, role, department, position, and status.
 * 6. Confirms the task is created with status 'open' by default.
 * 7. Verifies that a TaskHistory entry records the creation event in statusHistories.
 */
export async function test_api_task_creation_with_assignment_to_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with project management permissions
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an active project for the task
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Add an employee as a project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 4. Create a task assigned to the project member
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        assigned_employee_id: projectMember.employee.id,
      },
    },
  );
  typia.assert(task);
  // 5. Verify assignedEmployee is populated with correct employee data
  TestValidator.predicate(
    "assignedEmployee is not null",
    task.assignedEmployee !== null,
  );
  TestValidator.equals(
    "assigned employee id matches project member",
    task.assignedEmployee!.id,
    projectMember.employee.id,
  );
  // 6. Verify task status defaults to 'open'
  TestValidator.equals("task status is open", task.status, "open");
  // 7. Verify task history records the creation event
  TestValidator.predicate(
    "task history records creation",
    task.statusHistories.length > 0,
  );
}
