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

/**
 * Test creating a subtask (child task) linked to a parent task within the same project.
 * This validates the one-level subtasking capability.
 *
 * Steps:
 * 1. Authenticate as a member via POST /erpHrm/auth/member/join
 * 2. Create a project via POST /erpHrm/member/projects
 * 3. Create parent task via POST /erpHrm/member/projects/{projectId}/tasks (with no parent_id or parent_id: null)
 * 4. Create subtask via POST /erpHrm/member/projects/{projectId}/tasks with parent_id referencing the parent task's id
 *
 * Validation points:
 * - Parent task is created successfully with 201 status
 * - Subtask is created successfully with 201 status
 * - Subtask's parent_id matches the parent task's id
 * - Both tasks are associated with the same project
 * - Subtask inherits project context from the endpoint path
 */
export async function test_api_task_subtask_creation_same_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project that will contain parent and subtask
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create parent task (no parent_id or parent_id: null)
  const parentTask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "urgent",
        ] as const),
        parent_id: null,
      },
    },
  );
  typia.assert(parentTask);
  // 4. Create subtask with parent_id referencing the parent task
  const subtask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "urgent",
        ] as const),
        parent_id: parentTask.id,
      },
    },
  );
  typia.assert(subtask);
  // 5. Validate the relationships
  // Both tasks are associated with the same project
  TestValidator.equals(
    "parent task project id matches",
    parentTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "subtask project id matches",
    subtask.project.id,
    project.id,
  );
  // Subtask inherits project context from the endpoint path (same project as parent)
  TestValidator.equals(
    "subtask same project as parent",
    subtask.project.id,
    parentTask.project.id,
  );
  // Subtask should have no subtasks itself (leaf node - one level nesting only)
  TestValidator.equals("subtask has no subtasks", subtask.subtasks.length, 0);
  // Parent task should contain the subtask in its subtasks array
  TestValidator.predicate(
    "parent task subtasks contain subtask",
    parentTask.subtasks.some((st) => st.id === subtask.id),
  );
}
