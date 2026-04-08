import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_projects_tasks_create } from "../../../generate/generate_random_hrm_member_organizations_projects_tasks_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";

/**
 * Test task status update permission boundary for project leads.
 *
 * Validates that project leads can only update task status in projects where they have the project-lead role. The test creates two projects, assigns the member as project-lead to only one project, creates tasks in both projects, and verifies that status updates succeed only for the assigned project while being denied for the unassigned project.
 *
 * This test ensures proper permission enforcement for task management operations across different project contexts.
 *
 * 1. Create and authenticate a member user.
 * 2. Create first project where member will be assigned as project-lead.
 * 3. Create second project where member will NOT be assigned.
 * 4. Create employee record and assign member as project-lead to first project only.
 * 5. Create a task in the first project (member has project-lead role).
 * 6. Create a task in the second project (member does NOT have project-lead role).
 * 7. Successfully update task status in the first project.
 * 8. Attempt to update task status in the second project and expect permission denied error.
 */
export async function test_api_task_status_update_permission_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Use organization ID from test infrastructure (assumed to exist)
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // Create employee ID for project membership (assumes employee record exists in test setup)
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create first project where member will be project-lead
  const project1 =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name()} Project 1`,
          color_code: "#FF5733",
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(project1);
  // 3. Create second project where member will NOT be project-lead
  const project2 =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name()} Project 2`,
          color_code: "#33FF57",
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(project2);
  // 4. Assign employee as project-lead to first project only
  const projectMember1 =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      body: {
        employee_id: employeeId,
        role: "project-lead",
      } satisfies IHrmProjectMember.ICreate,
      params: { projectId: project1.id },
    });
  typia.assert(projectMember1);
  // 5. Create task in first project (employee has project-lead role)
  const task1 =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          priority: "medium",
          status: "open",
        } satisfies IHrmTask.ICreate,
        params: {
          organizationId,
          projectId: project1.id,
        },
      },
    );
  typia.assert(task1);
  // 6. Create task in second project (employee does NOT have project-lead role)
  const task2 =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          priority: "high",
          status: "open",
        } satisfies IHrmTask.ICreate,
        params: {
          organizationId,
          projectId: project2.id,
        },
      },
    );
  typia.assert(task2);
  // 7. Successfully update task status in first project (employee is project-lead)
  const updatedTask1 =
    await api.functional.hrm.member.organizations.projects.tasks.status(
      memberConnection,
      {
        organizationId,
        projectId: project1.id,
        taskId: task1.id,
        body: {
          status: "in-progress",
        } satisfies IHrmTask.IStatusUpdate,
      },
    );
  typia.assert(updatedTask1);
  TestValidator.equals(
    "task1 status updated",
    updatedTask1.status,
    "in-progress",
  );
  // 8. Attempt to update task status in second project (employee is NOT project-lead)
  // This should fail with permission denied error
  await TestValidator.httpError(
    "permission denied for task in unassigned project",
    403,
    async () => {
      await api.functional.hrm.member.organizations.projects.tasks.status(
        memberConnection,
        {
          organizationId,
          projectId: project2.id,
          taskId: task2.id,
          body: {
            status: "in-progress",
          } satisfies IHrmTask.IStatusUpdate,
        },
      );
    },
  );
}
