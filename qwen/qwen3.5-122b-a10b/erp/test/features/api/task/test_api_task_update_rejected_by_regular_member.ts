import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_projects_tasks_create } from "../../../generate/generate_random_hrm_member_organizations_projects_tasks_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";

/**
 * Test that regular project member cannot update task without proper permissions.
 *
 * Validates permission enforcement for task update operations where only project-lead role or users with project:manage permission can modify tasks. Regular members should receive HTTP 403 Forbidden when attempting to update tasks.
 *
 * The test creates a scenario with two authenticated users: one assigned as project-lead who creates the task, and another assigned as regular member who attempts to update it. The update attempt must be rejected with appropriate error response.
 *
 * 1. Authenticate first member user and create organization context.
 * 2. Create project within the organization.
 * 3. Assign first user as project-lead to the project.
 * 4. Create task by project-lead member.
 * 5. Authenticate second member user.
 * 6. Assign second user as regular member (role: member) to the same project.
 * 7. Attempt to update task with regular member connection.
 * 8. Validate HTTP 403 Forbidden status is returned.
 * 9. Verify task remains unchanged after failed update attempt.
 */
export async function test_api_task_update_rejected_by_regular_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first member (will be project-lead)
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadAuth = await authorize_member_join(projectLeadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(projectLeadAuth);
  // Extract organizationId from auth response or generate for testing
  // Using organization from the member's context
  const organizationId: string & tags.Format<"uuid"> =
    projectLeadAuth.organizations?.[0]?.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 2. Create project
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      projectLeadConnection,
      {
        params: {
          organizationId,
        },
        body: {
          name: RandomGenerator.name(2),
          color_code: "#3498db",
          status: "active",
        },
      },
    );
  typia.assert(project);
  // 3. Assign first user as project-lead (using their employee context)
  // Note: In real scenario, employee would be created during organization join
  // For this test, we use the member's employee context
  const projectLeadMember =
    await generate_random_hrm_member_projects_members_create(
      projectLeadConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: projectLeadAuth.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(projectLeadMember);
  // 4. Create task by project-lead
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      projectLeadConnection,
      {
        params: {
          organizationId,
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          priority: "medium",
          status: "open",
        },
      },
    );
  typia.assert(task);
  // Store original task data for comparison
  const originalTaskTitle: string = task.title;
  const originalTaskStatus: string = task.status;
  // 5. Authenticate second member (will be regular member)
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMemberAuth = await authorize_member_join(
    regularMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(regularMemberAuth);
  // 6. Assign second user as regular member to the project
  const regularMemberAssignment =
    await generate_random_hrm_member_projects_members_create(
      regularMemberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: regularMemberAuth.id,
          role: "member",
        },
      },
    );
  typia.assert(regularMemberAssignment);
  // 7. Attempt to update task with regular member - should fail with 403
  await TestValidator.httpError(
    "regular member cannot update task without project-lead role",
    403,
    async () => {
      await api.functional.hrm.member.organizations.projects.tasks.update(
        regularMemberConnection,
        {
          organizationId,
          projectId: project.id,
          taskId: task.id,
          body: {
            title: "Modified by regular member",
            status: "in-progress",
          } satisfies IHrmTask.IUpdate,
        },
      );
    },
  );
  // 8. Verify task remains unchanged by retrieving it with project-lead connection
  const retrievedTask =
    await api.functional.hrm.member.organizations.projects.tasks.update(
      projectLeadConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
        body: {},
      },
    );
  typia.assert(retrievedTask);
  TestValidator.equals(
    "task title unchanged after failed update attempt",
    retrievedTask.title,
    originalTaskTitle,
  );
  TestValidator.equals(
    "task status unchanged after failed update attempt",
    retrievedTask.status,
    originalTaskStatus,
  );
}
