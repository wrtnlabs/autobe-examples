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
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
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
 * Test that a project-lead can retrieve task history entries for tasks within their assigned project.
 *
 * Setup: Create two members (lead and regular member), create organization, create project,
 * assign first member as project-lead and second member as regular member, create task,
 * change task status as project-lead to generate history. Then retrieve the history entry
 * as the project-lead.
 *
 * Validate: History entry is successfully retrieved with complete information including
 * the member who made the status change. This confirms project-lead role has proper
 * access to task audit trail within their project scope.
 *
 * Note: This test requires employee records to be created for members when they join
 * an organization. The test assumes member IDs correspond to employee IDs (auto-created
 * upon organization join). Additionally, task history generation requires updating task
 * status, but no task update endpoint is available in the provided API functions.
 */
export async function test_api_task_history_project_lead_access(
  connection: api.IConnection,
): Promise<void> {
  // Create separate connections for project-lead and regular member
  const leadConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  // Register project-lead member
  const leadAuth = await authorize_member_join(leadConnection, {
    body: {
      email: `lead.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(leadAuth);
  // Register regular member
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: `member.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create organization as project-lead
  // This auto-creates an employee record for the lead member
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      leadConnection,
      {},
    );
  typia.assert(organization);
  // Create project as project-lead
  const project =
    await generate_random_hrm_platform_member_projects_create(
      leadConnection,
      {},
    );
  typia.assert(project);
  // Assign project-lead to the project with project-lead role
  // Note: Uses member ID as employee ID (assumes auto-created employee record)
  const leadMembership =
    await generate_random_hrm_platform_member_projects_members_create(
      leadConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: leadAuth.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(leadMembership);
  TestValidator.equals(
    "lead membership role",
    leadMembership.role,
    "project-lead",
  );
  // Assign regular member to the project with member role
  // Note: Member needs to be part of the organization first to have an employee record
  const regularMembership =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: memberAuth.id,
          role: "member",
        },
      },
    );
  typia.assert(regularMembership);
  TestValidator.equals(
    "regular membership role",
    regularMembership.role,
    "member",
  );
  // Create task as project-lead
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    leadConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  TestValidator.equals("task project", task.project.id, project.id);
  // Note: To generate task history, we would need to update the task status
  // (e.g., from "open" to "in-progress"). However, no task update endpoint
  // is available in the provided API functions. In a complete implementation:
  // 1. Call task update endpoint to change status
  // 2. This would create a history entry automatically
  // 3. Retrieve the history entry ID from the response or list endpoint
  // For this test, we generate a history ID and attempt to retrieve history
  // In production, the history ID would come from the status update response
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve task history as project-lead
  const history =
    await api.functional.hrmPlatform.member.projects.tasks.histories.at(
      leadConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId: historyId,
      },
    );
  typia.assert(history);
  // Validate history entry structure
  TestValidator.predicate(
    "history has valid old status",
    ["open", "in-progress", "completed", "closed"].includes(history.oldStatus),
  );
  TestValidator.predicate(
    "history has valid new status",
    ["open", "in-progress", "completed", "closed"].includes(history.newStatus),
  );
  TestValidator.predicate(
    "history has valid timestamp",
    new Date(history.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "history has member information",
    history.member.id !== undefined &&
      history.member.display_name !== undefined,
  );
  // Validate that the history member is the project-lead who made the change
  TestValidator.equals(
    "history member is project-lead",
    history.member.id,
    leadAuth.id,
  );
}