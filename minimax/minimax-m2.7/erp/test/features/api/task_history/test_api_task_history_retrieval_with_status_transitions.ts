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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
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

export async function test_api_task_history_retrieval_with_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create project with 'active' status
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create task with initial status 'open'
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // 4. Change task status to 'in-progress' (auto-creates first history entry)
  const taskInProgress =
    await api.functional.erpHrm.member.projects.tasks.update(memberConnection, {
      projectId: project.id,
      taskId: task.id,
      body: { status: "in-progress" } satisfies IErpHrmTask.IUpdate,
    });
  typia.assert(taskInProgress);
  // 5. Change task status to 'completed' (auto-creates second history entry)
  const taskCompleted =
    await api.functional.erpHrm.member.projects.tasks.update(memberConnection, {
      projectId: project.id,
      taskId: task.id,
      body: { status: "completed" } satisfies IErpHrmTask.IUpdate,
    });
  typia.assert(taskCompleted);
  // 6. Retrieve task history via PATCH endpoint
  const historyResponse =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {} satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 7. Validate: response contains 2 history entries
  TestValidator.equals("history entry count", historyResponse.data.length, 2);
  // Validate first history entry: open → in-progress
  const firstEntry = historyResponse.data[0];
  TestValidator.equals(
    "first entry previous status",
    firstEntry.previousStatus,
    "open",
  );
  TestValidator.equals(
    "first entry new status",
    firstEntry.newStatus,
    "in-progress",
  );
  TestValidator.equals(
    "first entry member id",
    firstEntry.member.id,
    authorized.id,
  );
  // Validate second history entry: in-progress → completed
  const secondEntry = historyResponse.data[1];
  TestValidator.equals(
    "second entry previous status",
    secondEntry.previousStatus,
    "in-progress",
  );
  TestValidator.equals(
    "second entry new status",
    secondEntry.newStatus,
    "completed",
  );
  TestValidator.equals(
    "second entry member id",
    secondEntry.member.id,
    authorized.id,
  );
  // Validate chronological order (first entry created before second entry)
  const firstCreatedAt = new Date(firstEntry.createdAt).getTime();
  const secondCreatedAt = new Date(secondEntry.createdAt).getTime();
  TestValidator.predicate(
    "entries ordered chronologically",
    secondCreatedAt > firstCreatedAt,
  );
}
