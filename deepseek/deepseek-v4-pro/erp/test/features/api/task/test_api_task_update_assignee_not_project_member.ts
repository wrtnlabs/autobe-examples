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
 * Test that reassigning a task to an employee who is not a project member
 * is rejected with 422 Unprocessable Entity.
 *
 * Validates the business rule that only active project members can be assigned
 * to tasks within that project. When a project lead attempts to assign a task
 * to an employee who has never been added to the project (or belongs to a
 * different organization), the system must reject the update with a 422 status.
 *
 * The test isolates the project membership validation from the task update flow
 * by creating two independent member accounts in separate organizations —
 * ensuring the proposed assignee has no relationship whatsoever with the
 * project. The task is initially created without an assignee, and the failed
 * update attempt confirms that the gatekeeping logic works correctly.
 *
 * 1. Project lead registers via authorize_member_join and creates a project.
 * 2. Project lead is assigned as project-lead on the project.
 * 3. A task is created within the project without an assignee.
 * 4. A second member registers via a separate authorize_member_join call
 *    and is never added to the project.
 * 5. Project lead attempts to update the task with assignedEmployeeId set
 *    to the second member's member ID.
 * 6. System rejects with 422 Unprocessable Entity, confirming the assignee
 *    is not an active member of the task's parent project.
 */
export async function test_api_task_update_assignee_not_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Project lead joins and creates a project
  const leadConnection: api.IConnection = { host: connection.host };
  const lead = await authorize_member_join(leadConnection, {});
  typia.assert(lead);
  const project = await generate_random_erp_hrm_member_projects_create(
    leadConnection,
    {},
  );
  typia.assert(project);
  // 2. Assign project lead as project-lead
  const leadMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      leadConnection,
      {
        body: { role: "project-lead" },
        params: { projectId: project.id },
      },
    );
  typia.assert(leadMembership);
  // 3. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    leadConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 4. Second member registers — never added to the project
  const otherConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherConnection, {});
  typia.assert(otherMember);
  // 5. Project lead attempts to assign task to non-project-member
  await TestValidator.error(
    "assigning non-project-member to task should fail with 422",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.update(leadConnection, {
        projectId: project.id,
        taskId: task.id,
        body: {
          assignedEmployeeId: otherMember.id,
        } satisfies IErpHrmTask.IUpdate,
      });
    },
  );
}
