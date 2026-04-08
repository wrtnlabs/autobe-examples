import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_update_assignment_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_timezone: "UTC",
      org_fiscal_month: 1,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create authenticated connection
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${memberAuth.token.access}` },
  };
  // 2. List existing employees
  const employeesPage = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(employeesPage);
  TestValidator.equals("employee count", employeesPage.data.length, 2);
  // 3. Create a project
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code:
          `#${typia.random<string & tags.Format<"uri">>()}`.slice(0, 8) ||
          "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Assign first employee as project member
  const projectMember = employeesPage.data[0];
  await api.functional.hrmPlatform.member.projects.memberships.create(
    memberConnection,
    {
      projectId: project.id,
      body: {
        employee_id: projectMember.id,
        role: "member",
      } satisfies IHrmPlatformProjectMembership.ICreate,
    },
  );
  // 5. Create task assigned to project member
  const task = (await api.functional.hrmPlatform.member.tasks.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        project_id: project.id,
        assigned_employee_id: projectMember.id,
      } satisfies IHrmPlatformTask.ICreate,
    },
  )) as IHrmPlatformTask & { id: string };
  // 6. Attempt to assign task to non-member employee (should fail)
  const nonMember = employeesPage.data[1];
  await TestValidator.error(
    "task assignment rejected for non-member",
    async () => {
      await api.functional.hrmPlatform.member.tasks.update(memberConnection, {
        taskId: task.id,
        body: {
          assigned_employee_id: nonMember.id,
        } satisfies IHrmPlatformTask.IUpdate,
      });
    },
  );
}