import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_employees_create } from "../../../generate/generate_random_hrm_time_tracking_member_employees_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_employee } from "../../../prepare/prepare_random_hrm_time_tracking_employee";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_project_task_update_cross_project_assignment_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await api.functional.hrmTimeTracking.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHrmTimeTrackingMember.IJoin,
    },
  );
  typia.assert(memberJoin);
  const projectCreateBody = (name: string) =>
    ({
      name,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      colorCode: "#3366ff",
      status: "active",
      budgetHours: 100,
    }) satisfies IHrmTimeTrackingProject.ICreate;
  const projectOne =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: projectCreateBody(`project-one-${RandomGenerator.alphabets(6)}`),
      },
    );
  typia.assert(projectOne);
  const projectTwo =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: projectCreateBody(`project-two-${RandomGenerator.alphabets(6)}`),
      },
    );
  typia.assert(projectTwo);
  const employeeJoin = await api.functional.hrmTimeTracking.auth.member.join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHrmTimeTrackingMember.IJoin,
    },
  );
  typia.assert(employeeJoin);
  const employee =
    await generate_random_hrm_time_tracking_member_employees_create(
      memberConnection,
      {
        body: {
          userAccountId: employeeJoin.id,
          roleId: projectTwo.organization.id,
          employmentType: "full_time",
          status: "active",
        } satisfies IHrmTimeTrackingEmployee.ICreate,
      },
    );
  typia.assert(employee);
  const originalTask =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectOne.id },
        body: {
          title: `original-task-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "normal",
          status: "open",
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(originalTask);
  const foreignParentTask =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectTwo.id },
        body: {
          title: `foreign-parent-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "normal",
          status: "open",
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(foreignParentTask);
  const originalSnapshot = {
    title: originalTask.title,
    description: originalTask.description,
    status: originalTask.status,
    priority: originalTask.priority,
    assigneeId: originalTask.assignee?.id ?? null,
    parentId: originalTask.parent?.id ?? null,
    projectId: originalTask.project.id,
  };
  await TestValidator.httpError(
    "cross-project assignee must be rejected",
    [400, 403, 404, 409, 422],
    async () => {
      await api.functional.hrmTimeTracking.member.projects.tasks.update(
        memberConnection,
        {
          projectId: projectOne.id,
          taskId: originalTask.id,
          body: {
            hrm_time_tracking_employee_id: employee.id,
          } satisfies IHrmTimeTrackingTask.IUpdate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "cross-project parent must be rejected",
    [400, 403, 404, 409, 422],
    async () => {
      await api.functional.hrmTimeTracking.member.projects.tasks.update(
        memberConnection,
        {
          projectId: projectOne.id,
          taskId: originalTask.id,
          body: {
            parent_id: foreignParentTask.id,
          } satisfies IHrmTimeTrackingTask.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "task project remains unchanged",
    originalTask.project.id,
    originalSnapshot.projectId,
  );
  TestValidator.equals(
    "task title remains unchanged",
    originalTask.title,
    originalSnapshot.title,
  );
  TestValidator.equals(
    "task description remains unchanged",
    originalTask.description,
    originalSnapshot.description,
  );
  TestValidator.equals(
    "task status remains unchanged",
    originalTask.status,
    originalSnapshot.status,
  );
  TestValidator.equals(
    "task priority remains unchanged",
    originalTask.priority,
    originalSnapshot.priority,
  );
  TestValidator.equals(
    "task assignee remains unchanged",
    originalTask.assignee?.id ?? null,
    originalSnapshot.assigneeId,
  );
  TestValidator.equals(
    "task parent remains unchanged",
    originalTask.parent?.id ?? null,
    originalSnapshot.parentId,
  );
}
