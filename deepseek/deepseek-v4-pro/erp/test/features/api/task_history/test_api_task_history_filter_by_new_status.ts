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
 * Verify that the task history endpoint correctly filters results by the new_status parameter.
 *
 * After creating a task with default status 'open', the creation history entry has new_status='open'. This test validates bidirectional filter behavior: first confirming that matching filters return the expected entry, then confirming that non-matching filters return an empty result set.
 *
 * 1. Member joins and gets authenticated.
 * 2. A project is created for task organization.
 * 3. The member is assigned to the project for access control.
 * 4. A task is created with default status 'open', generating a history entry.
 * 5. History is queried with new_statuses=['open'] — validates one entry with new_status='open'.
 * 6. History is queried with new_statuses=['completed'] — validates zero entries.
 */
export async function test_api_task_history_filter_by_new_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign member to project for access
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 4. Create a task with default status 'open'
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 5. Query history filtered by new_statuses=['open']
  const historyWithOpen =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          new_statuses: ["open"],
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(historyWithOpen);
  TestValidator.equals(
    "open filter record count",
    historyWithOpen.pagination.records,
    1,
  );
  TestValidator.equals(
    "open filter data count",
    historyWithOpen.data.length,
    1,
  );
  TestValidator.equals(
    "new_status is open",
    historyWithOpen.data[0].new_status,
    "open",
  );
  // 6. Query history filtered by new_statuses=['completed']
  const historyWithCompleted =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          new_statuses: ["completed"],
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(historyWithCompleted);
  TestValidator.equals(
    "completed filter record count",
    historyWithCompleted.pagination.records,
    0,
  );
  TestValidator.equals(
    "completed filter data count",
    historyWithCompleted.data.length,
    0,
  );
}
