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
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_project_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create authenticated member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create a project with budget hours and date range
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#FF5733",
        budget_hours: 100,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(project);
  // 3. Create additional employees in the organization
  const employee1 = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee1);
  const employee2 = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee2);
  // 4. Assign employees as project members
  const projectMember1 =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employee1.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember1);
  const projectMember2 =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employee2.id,
          role: "project_lead",
        },
      },
    );
  typia.assert(projectMember2);
  // 5. Create multiple tasks within the project
  const task1 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "high",
        employee_id: employee1.id,
        estimated_hours: 8,
      },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "in-progress",
        priority: "medium",
        employee_id: employee2.id,
        estimated_hours: 4,
      },
    },
  );
  typia.assert(task2);
  const task3 = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "low",
        employee_id: null,
      },
    },
  );
  typia.assert(task3);
  // 6. Create timelogs for the project
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task1.id,
        date: new Date().toISOString(),
        duration: 120,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task2.id,
        date: new Date().toISOString(),
        duration: 60,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: null,
        date: new Date().toISOString(),
        duration: 30,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: false,
      },
    },
  );
  typia.assert(timelog3);
  // 7. Execute: Retrieve project with full details
  const retrievedProject = await api.functional.erpHrm.member.projects.at(
    memberConnection,
    { projectId: project.id },
  );
  typia.assert(retrievedProject);
  // 8. Validate project properties match created data
  TestValidator.equals("project id", retrievedProject.id, project.id);
  TestValidator.equals("project name", retrievedProject.name, project.name);
  TestValidator.equals("project status", retrievedProject.status, "active");
  TestValidator.equals("budget hours", retrievedProject.budgetHours, 100);
  TestValidator.equals(
    "organization id",
    retrievedProject.organization.id,
    project.organization.id,
  );
  // 9. Validate tasks array contains all created tasks
  TestValidator.equals("tasks count", retrievedProject.tasks.length, 3);
  const taskIds = retrievedProject.tasks.map((t) => t.id);
  TestValidator.predicate(
    "task1 exists in project",
    taskIds.includes(task1.id),
  );
  TestValidator.predicate(
    "task2 exists in project",
    taskIds.includes(task2.id),
  );
  TestValidator.predicate(
    "task3 exists in project",
    taskIds.includes(task3.id),
  );
  // 10. Validate task assignments match created data
  const task1Summary = retrievedProject.tasks.find((t) => t.id === task1.id);
  const task2Summary = retrievedProject.tasks.find((t) => t.id === task2.id);
  const task3Summary = retrievedProject.tasks.find((t) => t.id === task3.id);
  TestValidator.equals(
    "task1 assigned employee",
    task1Summary?.employee?.id,
    employee1.id,
  );
  TestValidator.equals(
    "task2 assigned employee",
    task2Summary?.employee?.id,
    employee2.id,
  );
  TestValidator.equals("task3 has no assignment", task3Summary?.employee, null);
  // 11. Validate aggregated counts
  TestValidator.equals("timelogs count", retrievedProject.timelogsCount, 3);
  TestValidator.equals("members count", retrievedProject.membersCount, 2);
}
