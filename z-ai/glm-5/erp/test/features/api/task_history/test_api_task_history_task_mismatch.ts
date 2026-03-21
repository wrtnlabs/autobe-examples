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
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_history_task_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // <SCENARIO DESCRIPTION HERE>
  // Test validates cross-parameter consistency when taskId doesn't match the
  // history's task. Creates two projects with tasks, then tries to access
  // Task A's history using Task B's taskId - should return 404.
  // <E2E TEST CODE HERE>
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create an employee record
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create Project A
  const projectA = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(projectA);
  // 4. Add employee as project member to Project A
  const projectMemberA =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: { employee_id: employee.id, role: "project_lead" },
      },
    );
  typia.assert(projectMemberA);
  // 5. Create Task A in Project A (generates history entry for status 'open')
  const taskA = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: projectA.id },
      body: { title: "Task A - Project A" },
    },
  );
  typia.assert(taskA);
  // 6. Create Project B
  const projectB = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(projectB);
  // 7. Add employee as project member to Project B
  const projectMemberB =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: { employee_id: employee.id, role: "project_lead" },
      },
    );
  typia.assert(projectMemberB);
  // 8. Create Task B in Project B
  const taskB = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: projectB.id },
      body: { title: "Task B - Project B" },
    },
  );
  typia.assert(taskB);
  // 9. Task creation generates history entries - get the historyId from Task A
  // The task has histories array with the status transition record
  TestValidator.predicate(
    "Task A should have at least one history entry",
    taskA.histories.length > 0,
  );
  const historyFromTaskA = taskA.histories[0]!;
  // 10. Attempt to retrieve Task A's history using Task B's ID
  // This should return 404 because history doesn't belong to Task B
  await TestValidator.httpError(
    "should return 404 when taskId doesn't match history's task",
    404,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.histories.at(
        memberConnection,
        {
          projectId: projectA.id,
          taskId: taskB.id, // Using Task B's ID instead of Task A's ID
          historyId: historyFromTaskA.id,
        },
      );
    },
  );
}
