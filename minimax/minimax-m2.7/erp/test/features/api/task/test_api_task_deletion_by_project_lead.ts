import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test task deletion by project-lead.
 *
 * This test validates that:
 * 1. A project-lead can successfully delete tasks within their assigned project
 * 2. The DELETE operation returns 204 No Content
 * 3. Project-leads cannot delete tasks in projects they don't lead
 *
 * Steps:
 * 1. Authenticate as a member using POST /erpHrm/auth/member/join
 * 2. Create a project using POST /erpHrm/member/projects
 * 3. Assign the authenticated member as project-lead using POST /erpHrm/member/projects/{projectId}/members
 * 4. Create a task within the project using POST /erpHrm/member/projects/{projectId}/tasks
 * 5. Delete the task using DELETE /erpHrm/member/projects/{projectId}/tasks/{taskId}
 * 6. Create another member and project to verify cross-project deletion is forbidden
 */
export async function test_api_task_deletion_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member who will be project-lead
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign the member as project-lead
  const projectMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          name: "project_lead",
          color: "#FF5733",
          status: "active",
        } as IErpHrmProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMembership);
  // 4. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: "Test Task for Deletion",
        priority: "high",
      } satisfies IErpHrmTask.ICreate,
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // 5. Delete the task as project-lead (expect 204 No Content)
  await api.functional.erpHrm.member.projects.tasks.erase(memberConnection, {
    projectId: project.id,
    taskId: task.id,
  });
  // 6. Create another member with a different project to test cross-project restriction
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {});
  const otherProject = await generate_random_erp_hrm_member_projects_create(
    otherMemberConnection,
    {},
  );
  typia.assert(otherProject);
  // Assign other member as project-lead of their own project
  await generate_random_erp_hrm_member_projects_members_create(
    otherMemberConnection,
    {
      body: {
        name: "project_lead",
        color: "#00FF00",
        status: "active",
      } as IErpHrmProjectMember.ICreate,
      params: {
        projectId: otherProject.id,
      },
    },
  );
  // Create a task in the other project
  const otherTask = await generate_random_erp_hrm_member_projects_tasks_create(
    otherMemberConnection,
    {
      body: {
        title: "Other Project Task",
        priority: "medium",
      } satisfies IErpHrmTask.ICreate,
      params: {
        projectId: otherProject.id,
      },
    },
  );
  typia.assert(otherTask);
  // Verify the first member (project-lead of first project) cannot delete tasks from the second project
  await TestValidator.httpError(
    "project-lead cannot delete tasks from another project",
    403,
    async () =>
      await api.functional.erpHrm.member.projects.tasks.erase(
        memberConnection,
        {
          projectId: otherProject.id,
          taskId: otherTask.id,
        },
      ),
  );
}
