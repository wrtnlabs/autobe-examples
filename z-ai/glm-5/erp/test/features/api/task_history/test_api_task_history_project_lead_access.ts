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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
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
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test that project leads can view task history for all tasks in their assigned project.
 * Validates business rule [307] - project leads have elevated permissions within
 * their assigned project to access task information.
 *
 * Flow:
 * 1. Authenticate member who will become project lead
 * 2. Create a project
 * 3. Create an employee record for the authenticated member
 * 4. Assign employee as project_lead to the project
 * 5. Create a task within the project
 * 6. Retrieve task history as project lead
 * 7. Verify successful access and proper response structure
 */
export async function test_api_task_history_project_lead_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member who will become a project lead
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: {} },
  );
  typia.assert(memberAuth);
  // Step 2: Create a project within the organization
  const project: IErpHrmProject =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      },
    });
  typia.assert(project);
  // Step 3: Create an employee record for the authenticated member
  const employee: IErpHrmEmployee =
    await generate_random_erp_hrm_member_employees_create(memberConnection, {
      body: {
        email: memberAuth.email,
        employmentType: "full_time",
      },
    });
  typia.assert(employee);
  // Step 4: Assign the employee as project_lead to the project
  const projectMember: IErpHrmProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employee.id,
          role: "project_lead",
        },
      },
    );
  typia.assert(projectMember);
  TestValidator.equals(
    "role is project_lead",
    projectMember.role,
    "project_lead",
  );
  // Step 5: Create a task within the project
  const task: IErpHrmTask =
    await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(task);
  // Step 6: Retrieve task history as project lead
  const historyResponse: IPageIErpHrmTaskHistory.ISummary =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {},
      },
    );
  typia.assert(historyResponse);
}
