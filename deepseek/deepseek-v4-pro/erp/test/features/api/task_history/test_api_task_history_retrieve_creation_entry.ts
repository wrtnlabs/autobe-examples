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
 * Test that task creation automatically records a status change history entry.
 *
 * Validates the end-to-end flow where creating a task generates an immutable
 * history entry in the task's audit trail. The creation entry records
 * old_status as null (indicating the task did not previously exist) and
 * new_status as "open" (the default initial workflow state).
 *
 * The test also validates that the task history retrieval endpoint returns
 * correct pagination metadata and that the history entry correctly references
 * the member who created the task through the changed_by_member relationship.
 *
 * 1. Member joins and is authenticated with JWT tokens.
 * 2. Member creates an active project for the task.
 * 3. Member is assigned to the project with a membership role.
 * 4. Member creates a task in the project with a random title.
 * 5. Retrieves the task status history via the histories endpoint.
 * 6. Validates pagination: current page, limit, total records, total pages.
 * 7. Validates the creation history entry with null old_status and "open"
 *    new_status, confirming the changed_by_member matches the authenticated
 *    member.
 */
export async function test_api_task_history_retrieve_creation_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Assign member to project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 4. Create task
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(task);
  // 5. Retrieve task history
  const historyResult =
    await api.functional.erpHrm.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(historyResult);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    historyResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", historyResult.pagination.limit, 10);
  TestValidator.equals("total records", historyResult.pagination.records, 1);
  TestValidator.equals("total pages", historyResult.pagination.pages, 1);
  // 7. Validate history data
  TestValidator.equals("history entries count", historyResult.data.length, 1);
  const entry = historyResult.data[0];
  TestValidator.equals(
    "old_status is null for creation entry",
    entry.old_status as string | null,
    null,
  );
  TestValidator.equals("new_status is open", entry.new_status, "open");
  TestValidator.equals(
    "changed_by_member id matches task creator",
    entry.changed_by_member.id,
    authorized.id,
  );
  TestValidator.predicate(
    "changed_by_member has display_name",
    entry.changed_by_member.display_name.length > 0,
  );
  TestValidator.predicate(
    "changed_by_member has email",
    entry.changed_by_member.email.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 timestamp",
    () => !isNaN(Date.parse(entry.created_at)),
  );
}
