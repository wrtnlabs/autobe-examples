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
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test that a regular project member (without project-lead role or project:manage
 * permission) cannot delete tasks. This validates authorization boundaries and
 * ensures proper permission enforcement.
 */
export async function test_api_task_deletion_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner with project:manage permission
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      displayName: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 3. Create employee A who will be project lead
  const projectLeadEmployee =
    await generate_random_erp_hrm_member_employees_create(ownerConnection, {});
  typia.assert(projectLeadEmployee);
  // 4. Add employee A to project with 'project_lead' role
  const projectLeadMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: projectLeadEmployee.id,
          role: "project_lead",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectLeadMember);
  // 5. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    ownerConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 6. Create a NEW member account for the regular member (not owner)
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMemberAuth = await authorize_member_join(
    regularMemberConnection,
    {
      body: {
        displayName: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(regularMemberAuth);
  // 7. Create employee B from the new member (in the same organization)
  const regularMemberEmployee =
    await generate_random_erp_hrm_member_employees_create(ownerConnection, {});
  typia.assert(regularMemberEmployee);
  // 8. Add employee B to project with 'member' role (NOT project_lead)
  await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: regularMemberEmployee.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // 9. Attempt to delete the task using regular member's connection
  // Should fail with 403 Forbidden since regular members don't have task deletion permission
  await TestValidator.httpError(
    "regular member cannot delete task",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.erase(
        regularMemberConnection,
        {
          projectId: project.id,
          taskId: task.id,
        },
      );
    },
  );
}
