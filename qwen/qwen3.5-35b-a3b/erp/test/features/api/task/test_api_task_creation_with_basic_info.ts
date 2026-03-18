import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_organizations_tasks_create } from "../../../generate/generate_random_hrms_member_organizations_tasks_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

/**
 * Test task creation with basic information.
 * Validates the primary success path for creating a task within a project.
 * 1. Join member with valid credentials
 * 2. Verify member has organization membership
 * 3. Create a project within the organization
 * 4. Add member as project lead
 * 5. Create a task with only required field (title)
 * 6. Verify task creation response structure
 */
export async function test_api_task_creation_with_basic_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Verify member has organization membership
  TestValidator.predicate(
    "member has organization memberships",
    memberAuth.organization_memberships.length > 0,
  );
  // 3. Extract organization ID from member's organization memberships
  const organizationId = memberAuth.organization_memberships[0].organization.id;
  typia.assert(organizationId);
  // 4. Create project connection
  const projectConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 5. Create project (basic success path)
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      projectConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        },
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 6. Verify project response structure
  TestValidator.equals(
    "project has dashboard type",
    project.dashboard_type,
    "personal",
  );
  // 7. Add member as project lead
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const projectMember =
    await generate_random_hrms_member_projects_members_add_member(
      projectConnection,
      {
        body: {
          employee_id: memberAuth.id,
          role: "project-lead",
        },
        params: { projectId },
      },
    );
  typia.assert(projectMember);
  // 8. Create task with only required field (title)
  const task = await generate_random_hrms_member_organizations_tasks_create(
    projectConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
      },
      params: { projectId },
    },
  );
  typia.assert(task);
  // 9. Verify task response structure
  TestValidator.equals(
    "task analytics array is empty initially",
    task.analytics.length,
    0,
  );
  TestValidator.equals("task total projects is 0", task.total_projects, 0);
  TestValidator.predicate(
    "task total budget hours is number or null",
    task.total_budget_hours === null ||
      (typeof task.total_budget_hours === "number" &&
        task.total_budget_hours >= 0),
  );
}
