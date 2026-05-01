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
 * Test that task history access is denied for non-project members.
 *
 * Verifies that task history visibility is properly scoped to project participants and authorized permission holders. A member who is neither a member of the parent project nor holds project:manage or project:view permission should be denied access to task history entries.
 *
 * The test creates a project and task through one member, generating an immutable history entry during task creation. A second, unrelated member then attempts to retrieve the same history entry while having no association with the project. The request must be rejected, confirming proper access control enforcement.
 *
 * 1. Member 1 registers and creates a project with a task, generating a status history entry.
 * 2. Member 2 registers independently with no project affiliation.
 * 3. Member 2 attempts to access the history entry and is denied.
 */
export async function test_api_task_history_access_denied_non_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member 1 registers and creates project & task
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  const project = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    {},
  );
  typia.assert(project);
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    member1Connection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  const historyEntry = typia.assert(task.statusHistories[0]!);
  // 2. Member 2 registers (unrelated to project)
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 3. Member 2 attempts to access history - should be denied
  await TestValidator.error(
    "non-member denied task history access",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.histories.at(
        member2Connection,
        {
          projectId: project.id,
          taskId: task.id,
          historyId: historyEntry.id,
        },
      );
    },
  );
}
