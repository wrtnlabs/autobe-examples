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

export async function test_api_task_history_cross_task_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create two separate projects
  const project1 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project1);
  const project2 = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project2);
  // 3. Create a task in the first project
  const task1 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project1.id },
    },
  );
  typia.assert(task1);
  // 4. Update the task status to generate a history entry for first task
  const updatedTask1 = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project1.id,
      taskId: task1.id,
      body: {
        status: "in-progress",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask1);
  // Get the history ID from the first task
  const historyId =
    updatedTask1.taskHistories[updatedTask1.taskHistories.length - 1]!.id;
  // 5. Create a task in the second project
  const task2 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project2.id },
    },
  );
  typia.assert(task2);
  // 6. Update second task status to generate history entry
  const updatedTask2 = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project2.id,
      taskId: task2.id,
      body: {
        status: "completed",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask2);
  // 7. Attempt to retrieve history entry from task2 using historyId from task1
  // This should return 404 because the history ID belongs to task1, not task2
  await TestValidator.error("cross-task history access denied", async () => {
    await api.functional.erpHrm.member.projects.tasks.histories.at(
      memberConnection,
      {
        projectId: project2.id,
        taskId: task2.id,
        historyId: historyId,
      },
    );
  });
}
