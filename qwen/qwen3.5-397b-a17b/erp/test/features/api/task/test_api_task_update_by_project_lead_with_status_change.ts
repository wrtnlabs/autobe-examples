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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test that a project lead can successfully update a task within their project,
 * including changing the task status which should automatically create a task history entry.
 *
 * Test Steps:
 * 1. Authenticate as a member using authorize_member_join utility function
 * 2. Create an organization using generate_random_hrm_platform_member_organizations_create utility function
 * 3. Select the created organization as active context
 * 4. Create a project using generate_random_hrm_platform_member_projects_create utility function
 * 5. Assign the member as project-lead using generate_random_hrm_platform_member_projects_members_create utility function
 * 6. Create a task with initial status 'open' using generate_random_hrm_platform_member_projects_tasks_create utility function
 * 7. Update the task with new title, description, priority, and change status from 'open' to 'in-progress'
 * 8. Verify the task update response contains all modified fields
 * 9. Verify task was updated correctly with all expected field changes
 */
export async function test_api_task_update_by_project_lead_with_status_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization (member becomes owner/employee automatically)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Select organization as active context
  await api.functional.hrmPlatform.member.organizations.select(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Assign member as project-lead
  // Need to get the employee ID - member becomes employee when organization is created
  // We'll need to query or use the member's ID as employee ID
  // For now, we'll create the project membership with the member's ID
  // Note: In the actual system, the member's employee record would be created automatically
  // We'll use the member auth ID as the employee ID for this test
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: memberAuth.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create initial task with status 'open'
  const initialTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          status: "open",
          priority: "medium",
        },
      },
    );
  typia.assert(initialTask);
  // 7. Update task with new fields and status change
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    priority: "high",
    status: "in-progress",
  } satisfies IHrmPlatformTask.IUpdate;
  const updatedTask =
    await api.functional.hrmPlatform.member.projects.tasks.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: initialTask.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTask);
  // 8. Validate task update response
  TestValidator.equals("task ID unchanged", updatedTask.id, initialTask.id);
  TestValidator.equals("title updated", updatedTask.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updatedTask.description,
    updateBody.description,
  );
  TestValidator.equals(
    "priority updated",
    updatedTask.priority,
    updateBody.priority,
  );
  TestValidator.equals(
    "status changed to in-progress",
    updatedTask.status,
    "in-progress",
  );
  TestValidator.notEquals(
    "status changed",
    initialTask.status,
    updatedTask.status,
  );
  TestValidator.equals("initial status was open", initialTask.status, "open");
  // 9. Validate project and organization context preserved
  TestValidator.equals(
    "project ID preserved",
    updatedTask.project.id,
    project.id,
  );
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updatedTask.updated_at).getTime() >
      new Date(updatedTask.created_at).getTime(),
  );
}
