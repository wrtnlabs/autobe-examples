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

export async function test_api_task_reassignment_to_project_member(
  connection: api.IConnection,
): Promise<void> {
  // Setup Member A (will become project lead)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  memberAConnection.headers = { Authorization: memberAAuthorized.token.access };
  // Create employee record for Member A in their organization
  const employeeA = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    { body: {} },
  );
  // Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    { body: {} },
  );
  // Add Member A to project with 'project_lead' role
  await generate_random_erp_hrm_member_projects_members_create(
    memberAConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: employeeA.id,
        role: "project_lead",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // Create a task in the project (initially unassigned)
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberAConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTask.ICreate,
    },
  );
  // Setup Member B (will become regular project member)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  memberBConnection.headers = { Authorization: memberBAuthorized.token.access };
  // Create employee record for Member B in Member A's organization (using Member A's connection)
  const employeeB = await api.functional.erpHrm.member.employees.create(
    memberAConnection,
    {
      body: {
        email: memberBEmail,
        employmentType: "full_time",
        roleId: employeeA.role.id,
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(employeeB);
  // Add Member B to project with 'member' role
  await generate_random_erp_hrm_member_projects_members_create(
    memberAConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: employeeB.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // Setup Member C (NOT a project member - will be used for failure case)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCEmail = typia.random<string & tags.Format<"email">>();
  const memberCAuthorized = await authorize_member_join(memberCConnection, {
    body: {
      email: memberCEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  memberCConnection.headers = { Authorization: memberCAuthorized.token.access };
  // Create employee record for Member C in Member A's organization (NOT a project member)
  const employeeC = await api.functional.erpHrm.member.employees.create(
    memberAConnection,
    {
      body: {
        email: memberCEmail,
        employmentType: "full_time",
        roleId: employeeA.role.id,
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(employeeC);
  // SUCCESS CASE: Reassign task to Member B (project member)
  const updatedTask = await api.functional.erpHrm.member.projects.tasks.update(
    memberAConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: { employeeId: employeeB.id } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  TestValidator.equals(
    "task assigned to project member",
    updatedTask.employee?.id,
    employeeB.id,
  );
  // FAILURE CASE: Attempt to reassign task to Member C (NOT a project member)
  await TestValidator.error(
    "non-project member assignment should fail",
    async () => {
      await api.functional.erpHrm.member.projects.tasks.update(
        memberAConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: { employeeId: employeeC.id } satisfies IErpHrmTask.IUpdate,
        },
      );
    },
  );
}
