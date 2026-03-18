import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test that a member who is not assigned to a project cannot retrieve task details from that project.
 *
 * This test verifies access control and data isolation by ensuring that employees
 * who are not project members cannot access tasks within that project, even if they
 * belong to the same organization.
 *
 * Setup:
 * 1. First member creates organization and becomes owner
 * 2. First member creates a project and a task within it
 * 3. Second member joins the organization as employee but is NOT added to the project
 * 4. Second member attempts to access the task - should be denied with 403
 */
export async function test_api_task_access_denied_for_non_project_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first member (project owner)
  const firstMemberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(firstMemberAuth);
  // Create first member's connection with auth token
  const firstMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: firstMemberAuth.token.access,
    },
  };
  // Step 2: Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      firstMemberConnection,
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
  // Step 3: Create employee record for first member
  // Generate a role_id for the employee creation (in real scenario, this would be the Owner role)
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const firstEmployee =
    await generate_random_hrm_platform_member_employees_create(
      firstMemberConnection,
      {
        body: {
          member_id: firstMemberAuth.member.id,
          role_id: roleId,
          employment_type: "full-time",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(firstEmployee);
  // Step 4: Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    firstMemberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // Step 5: Create task within the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    firstMemberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // Step 6: Register second member (non-project-member)
  const secondMemberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(secondMemberAuth);
  // Create second member's connection with auth token
  const secondMemberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: secondMemberAuth.token.access,
    },
  };
  // Step 7: Create employee record for second member in same organization
  // Using first member's connection to ensure same organization context
  const secondEmployee =
    await generate_random_hrm_platform_member_employees_create(
      firstMemberConnection,
      {
        body: {
          member_id: secondMemberAuth.member.id,
          role_id: firstEmployee.role.id,
          employment_type: "full-time",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(secondEmployee);
  // Step 8: Second member attempts to access the task - should be denied
  // The second member is NOT assigned to the project, so access should be forbidden
  await TestValidator.error(
    "non-project-member cannot access task",
    async () => {
      await api.functional.hrmPlatform.member.projects.tasks.at(
        secondMemberConnection,
        {
          projectId: project.id,
          taskId: task.id,
        },
      );
    },
  );
}
