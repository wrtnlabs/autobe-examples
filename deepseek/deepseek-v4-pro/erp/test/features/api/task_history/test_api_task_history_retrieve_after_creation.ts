import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test retrieval of a task history entry generated automatically upon task creation.
 *
 * Validates that a member can retrieve a task history entry by its unique identifier after creating a task within a project. The task creation itself produces an immutable history entry recording the initial status transition, and this entry must be retrievable through the full parent chain of project → task → history with all relation objects populated correctly.
 *
 * 1. Authenticate as a new member via join to obtain credentials.
 * 2. Create an active project to serve as the parent container for the task.
 * 3. Create a task with status "open" within the project, which auto-generates the first history entry.
 * 4. Extract the history entry ID from the task's statusHistories array.
 * 5. Retrieve the history entry by its ID through the nested GET endpoint.
 * 6. Validate business logic: history entry ID matches, task reference resolves to the created task, changedByMember identifies the creator, and new_status is "open".
 */
export async function test_api_task_history_retrieve_after_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task with status "open" — auto-generates creation history entry
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: { status: "open" },
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // The creation history entry is the first (and only) entry in statusHistories
  const creationHistory = task.statusHistories[0];
  typia.assert(creationHistory);
  // 4. Retrieve the history entry through the full parent chain
  const history =
    await api.functional.erpHrm.member.projects.tasks.histories.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId: creationHistory.id,
      },
    );
  typia.assert(history);
  // 5. Validate business logic
  TestValidator.equals(
    "history entry id matches",
    history.id,
    creationHistory.id,
  );
  TestValidator.equals(
    "task reference resolves to created task",
    history.task.id,
    task.id,
  );
  TestValidator.equals(
    "changed by member is the creator",
    history.changedByMember.id,
    member.id,
  );
  TestValidator.equals("new status is open", history.new_status, "open");
}
