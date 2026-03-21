import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_retrieval_with_assignee_and_project_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with project:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create a project that will contain the task
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "urgent",
        ] as const),
        status: "open",
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Retrieve the task via GET /admin/projects/{projectId}/tasks/{taskId}
  const retrievedTask = await api.functional.erpHrm.admin.projects.tasks.at(
    adminConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
  typia.assert(retrievedTask);
  // Validation: Response includes basic task fields
  TestValidator.equals("task id matches", retrievedTask.id, task.id);
  TestValidator.equals("task title matches", retrievedTask.title, task.title);
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    task.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    task.priority,
  );
  // Validate project summary in task response
  TestValidator.equals(
    "project id matches",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTask.project.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    retrievedTask.project.color,
    project.color,
  );
  TestValidator.equals(
    "project status matches",
    retrievedTask.project.status,
    project.status,
  );
  // Validate nested project organization context
  TestValidator.predicate(
    "project has organization",
    retrievedTask.project.organization !== undefined,
  );
  TestValidator.equals(
    "project organization id matches",
    retrievedTask.project.organization.id,
    project.organization.id,
  );
  TestValidator.equals(
    "project organization name matches",
    retrievedTask.project.organization.name,
    project.organization.name,
  );
  // Validate timestamps
  TestValidator.predicate(
    "task has created_at",
    retrievedTask.created_at !== undefined,
  );
  TestValidator.predicate(
    "task has updated_at",
    retrievedTask.updated_at !== undefined,
  );
  // Validate array properties (empty for new task)
  TestValidator.predicate(
    "task has subtasks array",
    Array.isArray(retrievedTask.subtasks),
  );
  TestValidator.predicate(
    "task has taskHistories array",
    Array.isArray(retrievedTask.taskHistories),
  );
  TestValidator.predicate(
    "task has timelogs array",
    Array.isArray(retrievedTask.timelogs),
  );
  TestValidator.predicate(
    "task has timers array",
    Array.isArray(retrievedTask.timers),
  );
}
