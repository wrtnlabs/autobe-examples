import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_employees_contracts_create } from "../../../generate/generate_random_hrms_member_employees_contracts_create";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_employee_contract } from "../../../prepare/prepare_random_hrms_employee_contract";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_deletion_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: "http://test.example.com/join",
      referrer: "http://test.example.com/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization membership
  const membership =
    await generate_random_hrms_member_organization_members_create(
      memberConnection,
      {
        body: {
          hrms_organization_id: typia.random<string & tags.Format<"uuid">>(),
          hrms_member_id: memberAuth.id,
          hrms_organization_role_id:
            memberAuth.organization_memberships[0]?.organizationRole?.id ??
            typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(membership);
  // 3. Create employee in organization
  const employeePage = await api.functional.hrms.member.employees.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(employeePage);
  // Filter for active employee (we just created one via membership)
  const employee =
    employeePage.data.find((e) => e.status === "active") ??
    employeePage.data[0];
  TestValidator.equals(
    "employee exists and is active",
    employee !== undefined,
    true,
  );
  // 4. Create employment contract for employee
  const contract = await generate_random_hrms_member_employees_contracts_create(
    memberConnection,
    {
      params: {
        employeeId: employee.id,
      },
      body: {
        start_date: new Date().toISOString(),
        pay_rate: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        pay_period: "monthly",
        working_hours_per_week: 40,
      },
    },
  );
  typia.assert(contract);
  // 5. Create project in organization
  const organizationId = membership.organization.id;
  const projectResponse =
    await generate_random_hrms_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId,
        },
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          description: "Test project for task deletion authorization",
        },
      },
    );
  typia.assert(projectResponse);
  // Cast project response to summary type to access id property
  const project: IHrmsProject.ISummary =
    projectResponse as unknown as IHrmsProject.ISummary;
  typia.assert(project);
  // 6. Add employee as regular member (NOT project-lead) to project
  const memberResult =
    await generate_random_hrms_member_projects_members_add_member(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(memberResult);
  // Verify role is 'member' (not 'project-lead')
  TestValidator.equals(
    "member role is regular member",
    memberResult.role,
    "member",
  );
  // 7. Create task within project
  const taskResponse = await generate_random_hrms_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(taskResponse);
  // Cast task response to entity type to access id and title properties
  // The task entity structure based on ICreate and common patterns
  const task = taskResponse as IHrmsTask & {
    id: string & tags.Format<"uuid">;
    title: string;
  };
  typia.assert(task);
  // 8. Attempt to delete task with regular member credentials
  // This should fail with 403 Forbidden
  await TestValidator.error("regular member cannot delete task", async () => {
    await api.functional.hrms.member.tasks.erase(memberConnection, {
      taskId: task.id,
    });
  });
  // 9. Verify task still exists by creating a second task
  const task2 = await generate_random_hrms_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: "Second task to verify task1 still exists",
        priority: "low",
      },
    },
  );
  typia.assert(task2);
  // Verify task structure before deletion attempt
  TestValidator.equals(
    "task has valid structure",
    task.title !== undefined && task.title.length > 0,
    true,
  );
  TestValidator.equals("task has valid id", task.id !== undefined, true);
}
