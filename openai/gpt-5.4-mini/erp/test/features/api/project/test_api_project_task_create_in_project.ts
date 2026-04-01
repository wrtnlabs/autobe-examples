import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_tasks_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_task } from "../../../prepare/prepare_random_erp_hrm_time_task";

export async function test_api_project_task_create_in_project(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P4ssw0rd!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/join",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const projectName = RandomGenerator.name();
  const projectDescription = RandomGenerator.paragraph({ sentences: 2 });
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: projectName,
        description: projectDescription,
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 120,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const taskTitle = RandomGenerator.name();
  const taskDescription = RandomGenerator.paragraph({ sentences: 3 });
  const dueDate = new Date().toISOString();
  const task = await generate_random_erp_hrm_time_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: taskTitle,
        description: taskDescription,
        priority: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "urgent",
        ] as const),
        estimatedHours: 6,
        dueDate,
        employeeId: null,
        parentTaskId: null,
      } satisfies IErpHrmTimeTask.ICreate,
    },
  );
  typia.assert(task);
  TestValidator.equals(
    "task project id should match created project",
    task.project.id,
    project.id,
  );
  TestValidator.equals(
    "task project name should match created project",
    task.project.name,
    projectName,
  );
  TestValidator.equals(
    "task title should match request",
    task.title,
    taskTitle,
  );
  TestValidator.equals(
    "task description should match request",
    task.description,
    taskDescription,
  );
  TestValidator.equals(
    "new task status should default to open",
    task.status,
    "open",
  );
  TestValidator.equals("task should be unassigned", task.employee, null);
  TestValidator.equals("task should have no parent", task.parentTask, null);
  TestValidator.predicate(
    "task should remain within the selected organization context",
    task.project.id === project.id,
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user cannot create task",
    async () => {
      await api.functional.erpHrmTime.member.projects.tasks.create(
        unauthorizedConnection,
        {
          projectId: project.id,
          body: {
            title: RandomGenerator.name(),
          } satisfies IErpHrmTimeTask.ICreate,
        },
      );
    },
  );
}
