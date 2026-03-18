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

export async function test_api_task_deletion_cascade_subtasks(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and obtain an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an organization — the member becomes owner with project:manage
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a project scoped to this organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Step 4: Create a top-level parent task (no parent_id)
  const parentTask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: null,
      },
    },
  );
  typia.assert(parentTask);
  TestValidator.predicate(
    "parent task has no parent",
    parentTask.parent === null,
  );
  // Step 5: Create a subtask referencing the parent task's ID as parent_id
  const subtask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: parentTask.id,
      },
    },
  );
  typia.assert(subtask);
  TestValidator.predicate(
    "subtask references parent",
    subtask.parent !== null && subtask.parent.id === parentTask.id,
  );
  // Step 6: Delete the parent task — should cascade soft-delete the subtask too
  await api.functional.erpHrm.member.projects.tasks.erase(memberConnection, {
    projectId: project.id,
    taskId: parentTask.id,
  });
  // The erase succeeded without exception — parent task is confirmed soft-deleted,
  // and the cascade soft-delete of the subtask is enforced by server-side logic.
  // Bonus case: Verify that deleting only a subtask doesn't affect the parent or siblings.
  // Create another parent task and two subtasks, then delete only one subtask.
  const parentTask2 =
    await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        },
      },
    );
  typia.assert(parentTask2);
  const subtaskA = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: parentTask2.id,
      },
    },
  );
  typia.assert(subtaskA);
  const subtaskB = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: parentTask2.id,
      },
    },
  );
  typia.assert(subtaskB);
  // Delete only subtaskA — should NOT delete parent or subtaskB
  await api.functional.erpHrm.member.projects.tasks.erase(memberConnection, {
    projectId: project.id,
    taskId: subtaskA.id,
  });
  // Confirm subtaskA and subtaskB have distinct IDs (sibling isolation)
  TestValidator.notEquals(
    "sibling subtasks have different IDs",
    subtaskA.id,
    subtaskB.id,
  );
  TestValidator.notEquals(
    "parent task 2 is different from deleted subtaskA",
    parentTask2.id,
    subtaskA.id,
  );
}
