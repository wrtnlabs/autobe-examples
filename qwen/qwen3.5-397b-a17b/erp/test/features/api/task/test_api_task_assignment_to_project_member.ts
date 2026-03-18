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

export async function test_api_task_assignment_to_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and create organization
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create two employee records
  const employee1 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        status: "active",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee1);
  // Create second member for the assignee
  const member2Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  const employee2 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: member2Auth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        status: "active",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee2);
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign first employee as project-lead (task creator)
  const projectMember1 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee1.id,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember1);
  // 6. Assign second employee as regular member (task assignee)
  const projectMember2 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee2.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember2);
  // 7. Create task with assignee (employee2)
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        hrm_platform_employee_id: employee2.id,
        status: "open",
        priority: "medium",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 8. Verify task assignee is correctly set
  TestValidator.equals(
    "task assignee employee ID",
    task.assignee?.id,
    employee2.id,
  );
  TestValidator.equals(
    "task assignee display name",
    task.assignee?.display_name,
    employee2.display_name,
  );
  TestValidator.equals("task project ID", task.project.id, project.id);
  // 9. Test edge case: Create third employee NOT assigned to project
  const member3Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member3Auth);
  const employee3 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: member3Auth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        status: "active",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee3);
  // 10. Attempt to create task with non-project member assignee (should fail)
  await TestValidator.error(
    "task creation with non-project member assignee",
    async () => {
      await generate_random_hrm_platform_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            hrm_platform_employee_id: employee3.id,
            status: "open",
            priority: "medium",
          } satisfies IHrmPlatformTask.ICreate,
        },
      );
    },
  );
  // 11. Create deactivated employee
  const member4Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member4Auth);
  const employee4 = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: member4Auth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        status: "deactivated",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee4);
  // 12. Assign deactivated employee to project
  const projectMember4 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee4.id,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember4);
  // 13. Attempt to create task with deactivated employee assignee (should fail)
  await TestValidator.error(
    "task creation with deactivated employee assignee",
    async () => {
      await generate_random_hrm_platform_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            hrm_platform_employee_id: employee4.id,
            status: "open",
            priority: "medium",
          } satisfies IHrmPlatformTask.ICreate,
        },
      );
    },
  );
}
