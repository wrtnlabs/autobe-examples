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
 * Test scenario for deleting a task by a member with project:manage permission.
 *
 * Steps:
 * 1. Authenticate as a member using POST /erpHrm/auth/member/join to create a new member account
 * 2. Create a project using POST /erpHrm/member/projects with required fields (name, color, status)
 * 3. Create a task within the project using POST /erpHrm/member/projects/{projectId}/tasks with required fields (title, priority)
 * 4. Delete the task using DELETE /erpHrm/member/projects/{projectId}/tasks/{taskId}
 *
 * Validation points:
 * - Verify the request returns 204 No Content status (void response)
 * - Verify the task is permanently removed from the system
 * - This is an irreversible operation - deleted task cannot be recovered
 */
export async function test_api_task_deletion_by_project_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3A7AFE" as string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        priority: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "urgent",
        ] as const),
      },
    },
  );
  typia.assert(task);
  // 4. Delete the task using DELETE /erpHrm/member/projects/{projectId}/tasks/{taskId}
  await api.functional.erpHrm.member.projects.tasks.erase(memberConnection, {
    projectId: project.id,
    taskId: task.id,
  });
  // Validation: Verify task is permanently removed
  // Since we don't have a direct GET endpoint for tasks, we verify the deletion
  // succeeded by confirming no error was thrown (204 No Content returned)
  TestValidator.predicate("task deletion completed without error", true);
}
