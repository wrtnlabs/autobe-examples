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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_status_update_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member who will be the project-lead
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {});
  typia.assert(firstMember);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    firstMemberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task with initial status (open)
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    firstMemberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // 4. Create second member to assign as project-lead
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {});
  typia.assert(secondMember);
  // 5. Assign second member as project-lead to the project
  // Note: ICreate requires name, color, status for project membership creation
  const projectMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      secondMemberConnection,
      {
        params: { projectId: project.id },
        body: {
          name: `Member ${RandomGenerator.alphabets(5)}`,
          color: "#FF5733",
          status: "member" as any,
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMembership);
  // 6. Project-lead updates task status from "open" to "in-progress"
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    secondMemberConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "in-progress",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 7. Validate task status was updated
  TestValidator.equals(
    "task status updated to in-progress",
    updatedTask.status,
    "in-progress",
  );
  // 8. Validate task history entry was created with correct information
  const historyEntry = updatedTask.taskHistories.find(
    (h) => h.member.id === secondMember.id,
  );
  TestValidator.predicate(
    "task history entry created for project-lead",
    historyEntry !== undefined,
  );
  if (historyEntry) {
    TestValidator.equals(
      "previous status recorded",
      historyEntry.previous_status,
      "open",
    );
    TestValidator.equals(
      "new status recorded",
      historyEntry.new_status,
      "in-progress",
    );
    TestValidator.equals(
      "lead identity recorded",
      historyEntry.member.id,
      secondMember.id,
    );
  }
}
