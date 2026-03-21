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

export async function test_api_task_deletion_with_timelogs_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create organization owner with project:manage permission
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // Step 2: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create an employee for the owner
  // When a member joins, they create an organization with Owner role.
  // We create an additional employee record with the Owner role.
  // Note: The roleId is obtained from the organization's built-in roles.
  // For testing purposes, we use a generated UUID that references the Owner role.
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: owner.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employee);
  // Step 4: Add employee to project with 'project_lead' role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employee.id,
          role: "project_lead",
        },
      },
    );
  typia.assert(projectMember);
  // Step 5: Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    ownerConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // Step 6: Create a timelog associated with the task
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    ownerConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        date: new Date().toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // Step 7: Attempt to delete the task with associated timelogs
  // This should fail with 409 Conflict
  await TestValidator.httpError(
    "task with timelogs cannot be deleted",
    409,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.erase(ownerConnection, {
        projectId: project.id,
        taskId: task.id,
      });
    },
  );
}
