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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test that a non-project-member receives 403 when accessing task status history.
 *
 * Validates the access control rule that task history visibility is restricted to
 * employees assigned to the task's parent project or users holding project:manage
 * or project:view permissions.
 *
 * 1. Member A joins the platform and authenticates.
 * 2. Member A creates a project in active status.
 * 3. A project member is added to enable task creation within the project.
 * 4. Member A creates a task, which generates a creation history entry.
 * 5. Member B joins the platform with a completely separate account — no project
 *    membership, no elevated project permissions.
 * 6. Member B attempts to retrieve the task's history and receives a 403 Forbidden
 *    response, confirming that unauthorized members cannot view task histories.
 */
export async function test_api_task_history_access_denied_non_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 3. Add a project member to enable task creation
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberAConnection,
      { params: { projectId: project.id } },
    );
  typia.assert(projectMember);
  // 4. Member A creates a task, generating a creation history entry
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberAConnection,
    { params: { projectId: project.id } },
  );
  typia.assert(task);
  // 5. Member B joins — separate account, no project membership
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 6. Member B attempts to access task history → 403 Forbidden
  await TestValidator.httpError(
    "non-project-member should be denied access to task history",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.histories.index(
        memberBConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {} satisfies IErpHrmTaskHistory.IRequest,
        },
      );
    },
  );
}
