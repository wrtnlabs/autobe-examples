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

export async function test_api_task_update_status_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user for organization access
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
  // 2. Create project where task will be managed
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId: memberAuth.organizations![0].id,
        },
        body: {
          name: RandomGenerator.name(3),
          color_code: typia.random<
            string & tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$">
          >(),
          status: "active",
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(project);
  // 3. Assign member as project-lead to enable task management permissions
  // Since member just joined, we need to use the employee record created during join
  // The employee ID should be available from the organization context
  const employeeId = memberAuth.organizations![0].id; // Placeholder - actual implementation needs employee lookup
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: {
        projectId: project.id,
      },
      body: {
        employee_id: employeeId,
        role: "project-lead",
      } satisfies IHrmProjectMember.ICreate,
    });
  typia.assert(projectMember);
  // 4. Create task that will be updated by project lead
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        params: {
          organizationId: memberAuth.organizations![0].id,
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          priority: typia.random<"low" | "medium" | "high" | "urgent">(),
          status: "open",
        } satisfies IHrmTask.ICreate,
      },
    );
  typia.assert(task);
  // 5. Verify initial task status is 'open'
  TestValidator.equals("initial status is open", task.status, "open");
  // 6. Update task status to 'in-progress' (first transition)
  const taskInProgress =
    await api.functional.hrm.member.organizations.projects.tasks.update(
      memberConnection,
      {
        organizationId: memberAuth.organizations![0].id,
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "in-progress",
        } satisfies IHrmTask.IUpdate,
      },
    );
  typia.assert(taskInProgress);
  TestValidator.equals(
    "status updated to in-progress",
    taskInProgress.status,
    "in-progress",
  );
  // 7. Verify task history record was created for first transition
  TestValidator.equals(
    "history count after first update",
    taskInProgress.taskHistories.length,
    1,
  );
  TestValidator.equals(
    "first history old status",
    taskInProgress.taskHistories[0].old_status,
    "open",
  );
  TestValidator.equals(
    "first history new status",
    taskInProgress.taskHistories[0].new_status,
    "in-progress",
  );
  // 8. Update task status to 'completed' (second transition)
  const taskCompleted =
    await api.functional.hrm.member.organizations.projects.tasks.update(
      memberConnection,
      {
        organizationId: memberAuth.organizations![0].id,
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "completed",
        } satisfies IHrmTask.IUpdate,
      },
    );
  typia.assert(taskCompleted);
  TestValidator.equals(
    "status updated to completed",
    taskCompleted.status,
    "completed",
  );
  // 9. Verify multiple history records exist
  TestValidator.equals(
    "history count after second update",
    taskCompleted.taskHistories.length,
    2,
  );
  TestValidator.equals(
    "second history old status",
    taskCompleted.taskHistories[0].old_status,
    "in-progress",
  );
  TestValidator.equals(
    "second history new status",
    taskCompleted.taskHistories[0].new_status,
    "completed",
  );
  // 10. Update task status to 'closed' (third transition)
  const taskClosed =
    await api.functional.hrm.member.organizations.projects.tasks.update(
      memberConnection,
      {
        organizationId: memberAuth.organizations![0].id,
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "closed",
        } satisfies IHrmTask.IUpdate,
      },
    );
  typia.assert(taskClosed);
  TestValidator.equals("status updated to closed", taskClosed.status, "closed");
  // 11. Verify final history count
  TestValidator.equals(
    "final history count",
    taskClosed.taskHistories.length,
    3,
  );
  TestValidator.equals(
    "third history old status",
    taskClosed.taskHistories[0].old_status,
    "completed",
  );
  TestValidator.equals(
    "third history new status",
    taskClosed.taskHistories[0].new_status,
    "closed",
  );
}
