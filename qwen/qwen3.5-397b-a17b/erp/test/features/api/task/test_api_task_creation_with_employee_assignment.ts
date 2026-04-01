import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
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
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_creation_with_employee_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two member accounts (task creator and assignee)
  const creatorAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(creatorAuth);
  const assigneeAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(assigneeAuth);
  // 2. Create organization using creator's connection
  const creatorConnection: api.IConnection = { host: connection.host };
  creatorConnection.headers = { Authorization: creatorAuth.token.access };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      creatorConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    creatorConnection,
    {},
  );
  typia.assert(project);
  // 4. Invite the second member to the organization to create their employee record
  // When user exists, invitation creates employee and returns employee data
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      creatorConnection,
      {
        body: {
          email: assigneeAuth.email,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 5. Assign creator as project-lead (to have task creation permission)
  // The creator becomes an employee automatically when organization is created
  // We use the membership creation to establish the project-lead role
  const creatorMembership =
    await generate_random_hrm_platform_member_projects_members_create(
      creatorConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(creatorMembership);
  // 6. Assign second member as regular project member
  // Use the employee ID from the invitation response (user field contains employee info)
  const assigneeMembership =
    await generate_random_hrm_platform_member_projects_members_create(
      creatorConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(assigneeMembership);
  // 7. Create a task with hrm_platform_employee_id set to the second member's employee ID
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    creatorConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "open",
        priority: "medium",
        hrm_platform_employee_id: assigneeMembership.employee.id,
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 8. Validate the task is created successfully with the assignee relation populated
  TestValidator.predicate("assignee exists", task.assignee !== null);
  // 9. Verify the assignee object contains correct employee summary information
  if (task.assignee !== null) {
    typia.assertGuard(task.assignee);
    TestValidator.equals(
      "assignee employee ID matches membership",
      task.assignee.id,
      assigneeMembership.employee.id,
    );
    TestValidator.equals(
      "assignee display name matches",
      task.assignee.user.display_name,
      assigneeAuth.display_name,
    );
  }
  // 10. Confirm task assignment respects project membership requirement
  TestValidator.predicate(
    "task belongs to correct project",
    task.project.id === project.id,
  );
  TestValidator.equals("task status is open", task.status, "open");
  TestValidator.equals("task priority is medium", task.priority, "medium");
}
