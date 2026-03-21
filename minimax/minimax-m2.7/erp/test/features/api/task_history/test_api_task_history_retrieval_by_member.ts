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

export async function test_api_task_history_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task with initial status
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  const initialStatus = task.status;
  // 4. Update task status to trigger history creation
  const validStatuses = ["open", "in-progress", "completed", "closed"] as const;
  const newStatus =
    validStatuses.find((s) => s !== initialStatus) ?? "in-progress";
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: { status: newStatus } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 5. Retrieve the task history entry
  const taskHistories = updatedTask.taskHistories;
  const historyId = taskHistories[0]?.id;
  // Validate history was created
  TestValidator.predicate("history entry exists", historyId !== undefined);
  const history =
    await api.functional.erpHrm.member.projects.tasks.histories.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId: historyId!,
      },
    );
  typia.assert(history);
  // 6. Validate response
  TestValidator.equals(
    "previousStatus matches initial status",
    history.previousStatus,
    initialStatus,
  );
  TestValidator.equals(
    "newStatus matches updated status",
    history.newStatus,
    newStatus,
  );
  TestValidator.predicate(
    "member exists",
    history.member !== undefined && history.member !== null,
  );
  TestValidator.predicate(
    "createdAt is valid",
    history.createdAt !== undefined && history.createdAt !== null,
  );
}
