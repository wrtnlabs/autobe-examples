import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_update_status_change_creates_history(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate the member (becomes org owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create the organization (member automatically becomes owner with project:manage permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create the project using the owner's credentials
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Step 4: Create a task with explicit status 'open' and priority 'medium'
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        status: "open",
        priority: "medium",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: null,
        assignee_id: null,
        parent_id: null,
        estimated_hours: null,
        due_date: null,
      },
    },
  );
  typia.assert(task);
  // Step 5: Update the task - change status from 'open' to 'in-progress' and other attributes
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription = RandomGenerator.content({ paragraphs: 1 });
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const estimatedHours = 8;
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        title: newTitle as string & tags.MinLength<1>,
        status: "in-progress",
        priority: "high",
        estimated_hours: estimatedHours,
        due_date: futureDate,
        description: newDescription,
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // Validate updated fields
  TestValidator.equals("task title updated", updatedTask.title, newTitle);
  TestValidator.equals(
    "task status is in-progress",
    updatedTask.status,
    "in-progress",
  );
  TestValidator.equals("task priority is high", updatedTask.priority, "high");
  TestValidator.equals(
    "task estimated hours",
    updatedTask.estimatedHours,
    estimatedHours,
  );
  TestValidator.predicate("task due date is set", updatedTask.dueDate !== null);
  TestValidator.predicate(
    "task description is set",
    updatedTask.description !== null,
  );
  // Validate project reference
  TestValidator.equals(
    "task project id matches",
    updatedTask.project.id,
    project.id,
  );
  // Validate assignee is null (no assignee was set)
  TestValidator.equals("task assignee is null", updatedTask.assignee, null);
  // Validate task history: must contain at least one entry for the status transition
  TestValidator.predicate(
    "task history has entries",
    updatedTask.taskHistories.length >= 1,
  );
  // Find the history entry for the open -> in-progress transition
  const statusChangeHistory = updatedTask.taskHistories.find(
    (h) => h.oldStatus === "open" && h.newStatus === "in-progress",
  );
  TestValidator.predicate(
    "status change history entry exists (open -> in-progress)",
    statusChangeHistory !== undefined,
  );
  // Validate the recorder is present (non-null)
  if (statusChangeHistory !== undefined) {
    TestValidator.predicate(
      "history recorder is present",
      statusChangeHistory.recorder !== null,
    );
  }
}
