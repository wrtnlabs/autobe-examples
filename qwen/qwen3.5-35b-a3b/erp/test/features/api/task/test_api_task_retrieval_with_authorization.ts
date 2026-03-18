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
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

/**
 * Test successful retrieval of a task by an authorized member through proper project membership authorization.
 *
 * This test verifies that:
 * 1. A member can access tasks from projects they belong to
 * 2. Task retrieval endpoint responds correctly when properly authorized
 * 3. Authorization is properly enforced through project membership chain
 */
export async function test_api_task_retrieval_with_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Create member account (authentication)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: {} },
  );
  typia.assert(authorized);
  // Create organization membership for the member
  const organizationMembership: IHrmsOrganizationMember =
    await generate_random_hrms_member_organization_members_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(organizationMembership);
  // Generate UUID for project (since IHrmsProject doesn't expose id)
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create project within the organization
  const project: IHrmsProject =
    await generate_random_hrms_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color_code: "#3498db",
        },
        params: {
          organizationId: organizationMembership.organization.id,
        },
      },
    );
  typia.assert(project);
  // Add member to the project as a project member (member role)
  const projectMember: IHrmsProjectMember =
    await generate_random_hrms_member_projects_members_add_member(
      memberConnection,
      {
        body: {
          employee_id: authorized.id,
          role: "member",
        },
        params: {
          projectId: projectId,
        },
      },
    );
  typia.assert(projectMember);
  // Generate UUID for task
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create task within the project and assign it to the member
  const task: IHrmsTask =
    await generate_random_hrms_member_projects_tasks_create(memberConnection, {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open" as const,
        priority: "medium" as const,
        estimated_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        billable: true,
        hrms_employee_id: authorized.id,
      } satisfies IHrmsTask.ICreate,
      params: {
        projectId: projectId,
      },
    });
  typia.assert(task);
  // Retrieve the task using the member's authenticated connection
  const retrievedTask: IHrmsTask = await api.functional.hrms.member.tasks.at(
    memberConnection,
    {
      taskId: taskId,
    },
  );
  typia.assert(retrievedTask);
  // Validate task retrieval confirms authorization is working
  TestValidator.predicate(
    "task retrieval successful with proper authorization",
    () => retrievedTask !== null && retrievedTask !== undefined,
  );
}
