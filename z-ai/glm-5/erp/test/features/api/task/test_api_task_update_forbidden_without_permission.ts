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

export async function test_api_task_update_forbidden_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // ===== SETUP: Member A (Organization Owner) =====
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(memberAAuthorized);
  // Create Project 1
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project1);
  // Create a task in Project 1
  const task1 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberAConnection,
    {
      params: { projectId: project1.id },
    },
  );
  typia.assert(task1);
  // ===== SETUP: Member B (Regular Member) =====
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(memberBAuthorized);
  // Create employee record for Member B in Member A's organization
  const employeeB = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    {
      body: {
        email: memberBAuthorized.email,
      },
    },
  );
  typia.assert(employeeB);
  // Add Member B to Project 1 with 'member' role (NOT project_lead)
  const projectMemberB =
    await generate_random_erp_hrm_member_projects_members_create(
      memberAConnection,
      {
        params: { projectId: project1.id },
        body: {
          employee_id: employeeB.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMemberB);
  // ===== TEST 1: Regular Member Cannot Update Task =====
  await TestValidator.httpError(
    "regular member cannot update task",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.update(
        memberBConnection,
        {
          projectId: project1.id,
          taskId: task1.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTask.IUpdate,
        },
      );
    },
  );
  // ===== SETUP: Project 2 with Member B as Project Lead =====
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project2);
  // Create a task in Project 2
  const task2 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberAConnection,
    {
      params: { projectId: project2.id },
    },
  );
  typia.assert(task2);
  // Add Member B to Project 2 with 'project_lead' role
  const projectMemberB2 =
    await generate_random_erp_hrm_member_projects_members_create(
      memberAConnection,
      {
        params: { projectId: project2.id },
        body: {
          employee_id: employeeB.id,
          role: "project_lead",
        },
      },
    );
  typia.assert(projectMemberB2);
  // ===== TEST 2: Project Lead Cannot Update Tasks in Other Projects =====
  await TestValidator.httpError(
    "project lead cannot update tasks in projects where they are not project lead",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.update(
        memberBConnection,
        {
          projectId: project1.id,
          taskId: task1.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmTask.IUpdate,
        },
      );
    },
  );
  // ===== TEST 3: Project Lead Can Update Tasks in Their Project =====
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    memberBConnection,
    {
      projectId: project2.id,
      taskId: task2.id,
      body: {
        title: "Updated by project lead",
        status: "in-progress",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  TestValidator.equals(
    "task title updated",
    updatedTask.title,
    "Updated by project lead",
  );
  TestValidator.equals(
    "task status updated",
    updatedTask.status,
    "in-progress",
  );
}
