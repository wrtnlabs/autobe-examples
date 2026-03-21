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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_retrieval_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a specific task by project member who has access to the project.
  // Steps:
  // 1. Authenticate as member via POST /erpHrm/auth/member/join
  // 2. Create project via POST /erpHrm/member/projects with name, color, status=active
  // 3. Create task via POST /erpHrm/member/projects/{projectId}/tasks with title and priority
  // 4. Retrieve task via GET /erpHrm/member/projects/{projectId}/tasks/{taskId}
  // Expected: HTTP 200 with complete task entity including id, title, description, status, priority,
  // estimated_hours, due_date, project summary, assignee (null), subtasks array, taskHistories array,
  // timelogs array, timers array, created_at, updated_at.
  // 1. Authenticate as member via POST /erpHrm/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create project via POST /erpHrm/member/projects with name, color, status=active
  const project: IErpHrmProjectMember =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733" as const,
        status: "active" as const,
      },
    });
  typia.assert(project);
  // 3. Create task via POST /erpHrm/member/projects/{projectId}/tasks with title and priority
  const createdTask: IErpHrmTask =
    await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          priority: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "urgent",
          ] as const),
        },
      },
    );
  typia.assert(createdTask);
  // 4. Retrieve task via GET /erpHrm/member/projects/{projectId}/tasks/{taskId}
  const retrievedTask: IErpHrmTask =
    await api.functional.erpHrm.member.projects.tasks.at(memberConnection, {
      projectId: project.id,
      taskId: createdTask.id,
    });
  typia.assert(retrievedTask);
  // Validate retrieved task properties
  TestValidator.equals("task id matches", retrievedTask.id, createdTask.id);
  TestValidator.equals(
    "task title matches",
    retrievedTask.title,
    createdTask.title,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    createdTask.priority,
  );
  TestValidator.equals("task status is open", retrievedTask.status, "open");
  TestValidator.equals(
    "task project id matches",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "assignee is undefined",
    retrievedTask.assignee,
    undefined,
  );
  TestValidator.equals(
    "subtasks is empty array",
    retrievedTask.subtasks.length,
    0,
  );
  TestValidator.equals(
    "taskHistories is empty array",
    retrievedTask.taskHistories.length,
    0,
  );
  TestValidator.equals(
    "timelogs is empty array",
    retrievedTask.timelogs.length,
    0,
  );
  TestValidator.equals("timers is empty array", retrievedTask.timers.length, 0);
}
