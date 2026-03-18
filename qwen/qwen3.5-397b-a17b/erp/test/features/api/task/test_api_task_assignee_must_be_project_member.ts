import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_assignee_must_be_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create project lead member account
  const projectLeadAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(projectLeadAuth);
  // 2. Create regular employee member account
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  // 3. Create organization (as project lead)
  const projectLeadConnection: api.IConnection = { host: connection.host };
  projectLeadConnection.headers = {
    Authorization: `Bearer ${projectLeadAuth.token.access}`,
  };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      projectLeadConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 4. Create project lead as employee with manager role
  // First, we need to get the manager role - but we'll use the employee creation utility
  const projectLeadEmployee =
    await generate_random_hrm_platform_member_employees_create(
      projectLeadConnection,
      {
        body: {
          member_id: projectLeadAuth.id,
          employment_type: "full-time",
        },
      },
    );
  typia.assert(projectLeadEmployee);
  // 5. Create second employee (the one who will NOT be a project member initially)
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = {
    Authorization: `Bearer ${employeeAuth.token.access}`,
  };
  // Project lead creates the second employee
  const regularEmployee =
    await generate_random_hrm_platform_member_employees_create(
      projectLeadConnection,
      {
        body: {
          member_id: employeeAuth.id,
          employment_type: "full-time",
        },
      },
    );
  typia.assert(regularEmployee);
  // 6. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    projectLeadConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
      },
    },
  );
  typia.assert(project);
  // 7. Assign project lead as project-lead member
  const projectLeadMembership =
    await generate_random_hrm_platform_member_projects_members_create(
      projectLeadConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: projectLeadEmployee.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectLeadMembership);
  // 8. Create task (unassigned initially)
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    projectLeadConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 9. Attempt to assign task to regular employee who is NOT a project member - should fail
  await TestValidator.error(
    "assign task to non-project-member should fail",
    async () => {
      await api.functional.hrmPlatform.member.projects.tasks.update(
        projectLeadConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            hrm_platform_employee_id: regularEmployee.id,
          } satisfies IHrmPlatformTask.IUpdate,
        },
      );
    },
  );
  // 10. Now assign regular employee to project as member
  const regularEmployeeMembership =
    await generate_random_hrm_platform_member_projects_members_create(
      projectLeadConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: regularEmployee.id,
          role: "member",
        },
      },
    );
  typia.assert(regularEmployeeMembership);
  // 11. Retry task assignment - should succeed now
  const updatedTask =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      projectLeadConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          hrm_platform_employee_id: regularEmployee.id,
        } satisfies IHrmPlatformTask.IUpdate,
      },
    );
  typia.assert(updatedTask);
  // 12. Validate the assignee was set correctly
  TestValidator.equals(
    "task assignee should be regular employee",
    updatedTask.assignee?.id,
    regularEmployee.id,
  );
}
