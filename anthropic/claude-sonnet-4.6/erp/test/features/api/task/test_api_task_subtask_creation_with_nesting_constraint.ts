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

export async function test_api_task_subtask_creation_with_nesting_constraint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member (owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization (member becomes Owner with project:manage permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  const projectId = project.id;
  // Step A — Create the parent (top-level) task
  const parentTask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId },
      body: {
        title: "Epic: Authentication System",
        parent_id: null,
      },
    },
  );
  typia.assert(parentTask);
  const parentTaskId = parentTask.id;
  // Step B — Create the subtask referencing the parent
  const subtask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId },
      body: {
        title: "Subtask: Implement JWT token generation",
        parent_id: parentTaskId,
        priority: "high",
        estimated_hours: 3.5,
      },
    },
  );
  typia.assert(subtask);
  // Verifications on subtask
  TestValidator.predicate(
    "subtask.parent is not null",
    () => subtask.parent !== null,
  );
  TestValidator.equals(
    "subtask.parent.id matches parentTaskId",
    subtask.parent!.id,
    parentTaskId,
  );
  TestValidator.equals(
    "subtask.subtasks is empty array",
    subtask.subtasks.length,
    0,
  );
  TestValidator.equals(
    "subtask.title matches",
    subtask.title,
    "Subtask: Implement JWT token generation",
  );
  TestValidator.equals("subtask.priority is high", subtask.priority, "high");
  TestValidator.equals(
    "subtask.estimatedHours is 3.5",
    subtask.estimatedHours,
    3.5,
  );
  TestValidator.equals(
    "subtask.status defaults to open",
    subtask.status,
    "open",
  );
  TestValidator.equals("subtask.assignee is null", subtask.assignee, null);
  // Edge case — Preventing two-level nesting
  // Attempt to create a task with parent_id = subtask.id (subtask itself is already a subtask)
  await TestValidator.httpError(
    "cannot create task with subtask as parent (two-level nesting rejected)",
    422,
    async () => {
      await generate_random_erp_hrm_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId },
          body: {
            title: "Deep nested task - should be rejected",
            parent_id: subtask.id,
          },
        },
      );
    },
  );
}
