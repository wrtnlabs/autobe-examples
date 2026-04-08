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
 * Test task status update workflow for project lead role.
 *
 * Validates that a project lead can update task status through the complete workflow lifecycle and that all status transitions are properly recorded in the task history audit trail. The test creates a project, assigns the member as project-lead, creates a task, and then updates the task status through all workflow states (open → in-progress → completed → closed).
 *
 * Since organization and employee creation APIs are not available in the SDK, this test uses mock UUIDs for organization and employee IDs while testing the actual task status update functionality with real API calls.
 *
 * 1. Register and authenticate a new member account.
 * 2. Generate mock organization ID for project creation context.
 * 3. Create a project within the organization.
 * 4. Assign member as project-lead to enable task management permissions.
 * 5. Create a task within the project.
 * 6. Validate initial task status is "open".
 * 7. Update status: open → in-progress and validate.
 * 8. Update status: in-progress → completed and validate.
 * 9. Update status: completed → closed and validate.
 * 10. Validate task history contains all three status transitions.
 * 11. Validate history entries are in chronological order (most recent first).
 * 12. Validate each history entry contains required fields (timestamp, member, old_status, new_status).
 */
export async function test_api_task_status_update_project_lead_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate mock organization ID (organization creation API not available)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Generate mock employee ID (employee creation API not available)
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create project
  const project: IHrmProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: "#3B82F6",
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 5. Assign member as project-lead
  const projectMember: IHrmProjectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      body: {
        employee_id: employeeId,
        role: "project-lead",
      } satisfies IHrmProjectMember.ICreate,
      params: { projectId: project.id },
    });
  typia.assert(projectMember);
  // 6. Create task
  const task: IHrmTask =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          priority: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "urgent",
          ] as const),
          status: "open",
        } satisfies IHrmTask.ICreate,
        params: { organizationId, projectId: project.id },
      },
    );
  typia.assert(task);
  // 7. Validate initial status is "open"
  TestValidator.equals("initial status", task.status, "open");
  // 8. Update status: open → in-progress
  const inProgressTask: IHrmTask =
    await api.functional.hrm.member.organizations.projects.tasks.status(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
        body: { status: "in-progress" } satisfies IHrmTask.IStatusUpdate,
      },
    );
  typia.assert(inProgressTask);
  TestValidator.equals(
    "status after first update",
    inProgressTask.status,
    "in-progress",
  );
  // 9. Update status: in-progress → completed
  const completedTask: IHrmTask =
    await api.functional.hrm.member.organizations.projects.tasks.status(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
        body: { status: "completed" } satisfies IHrmTask.IStatusUpdate,
      },
    );
  typia.assert(completedTask);
  TestValidator.equals(
    "status after second update",
    completedTask.status,
    "completed",
  );
  // 10. Update status: completed → closed
  const closedTask: IHrmTask =
    await api.functional.hrm.member.organizations.projects.tasks.status(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
        body: { status: "closed" } satisfies IHrmTask.IStatusUpdate,
      },
    );
  typia.assert(closedTask);
  TestValidator.equals(
    "status after third update",
    closedTask.status,
    "closed",
  );
  // 11. Validate task history contains all transitions
  TestValidator.predicate(
    "has task history",
    closedTask.taskHistories.length > 0,
  );
  TestValidator.equals("history count", closedTask.taskHistories.length, 3);
  // 12. Validate history entries in chronological order (most recent first)
  const history: IHrmTaskHistory.ISummary[] = closedTask.taskHistories;
  TestValidator.equals(
    "last transition to closed",
    history[0].new_status,
    "closed",
  );
  TestValidator.equals(
    "second to last transition to completed",
    history[1].new_status,
    "completed",
  );
  TestValidator.equals(
    "first transition to in-progress",
    history[2].new_status,
    "in-progress",
  );
  // 13. Validate each history entry has required fields
  for (const hist of history) {
    typia.assert(hist);
    TestValidator.predicate("has timestamp", hist.timestamp.length > 0);
    TestValidator.predicate("has member", hist.member.id.length > 0);
    TestValidator.predicate("has old_status", hist.old_status.length > 0);
    TestValidator.predicate("has new_status", hist.new_status.length > 0);
  }
}
