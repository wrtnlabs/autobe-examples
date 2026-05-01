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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test that task retrieval is denied for non-project members.
 *
 * Validates the authorization rule that only project members, project leads, or users with organization-level project permissions can view task details. An employee who lacks any of these access paths must receive a 403 Forbidden response when attempting to retrieve task information through the GET /erpHrm/member/projects/{projectId}/tasks/{taskId} endpoint.
 *
 * The test establishes two separate members: Member A who owns the organization and creates all resources, and Member B who has no project membership or elevated permissions. After Member A successfully creates and retrieves a task, Member B attempts the same retrieval and is blocked with 403.
 *
 * 1. Member A registers via authorize_member_join and receives organization ownership.
 * 2. Member A creates an active project with randomized properties.
 * 3. Member A creates a task within the project using organization-level project:manage permission.
 * 4. Member A successfully retrieves the task, confirming the resource exists and is accessible.
 * 5. Member B registers as an independent member with no project affiliation.
 * 6. Member B attempts to retrieve the same task and receives 403 Forbidden.
 */
export async function test_api_task_retrieval_denied_for_non_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 3. Member A creates a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberAConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 4. Validate Member A can retrieve the task they created
  const retrieved = await api.functional.erpHrm.member.projects.tasks.at(
    memberAConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
  typia.assert(retrieved);
  // 5. Member B registers as an independent member
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Member B attempts to retrieve the task → 403 Forbidden
  await TestValidator.httpError(
    "non-project-member cannot retrieve task",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.at(memberBConnection, {
        projectId: project.id,
        taskId: task.id,
      });
    },
  );
}
