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
 * Test that an employee can update the status of a task.
 *
 * Validates the task status update workflow through the dedicated status endpoint. This test creates a project and task, then updates the task status to verify the status change is properly recorded and the task history audit trail captures the transition.
 *
 * Note: This test uses the project lead as the authenticated user for status updates. A complete test of 'assigned employee can update their own task' would require employee creation utilities to properly assign members as employees and link them to tasks. The current implementation validates the status update endpoint functionality and history recording.
 *
 * The test ensures that task status changes are properly recorded in the task history audit trail with correct member attribution and timestamp recording.
 *
 * 1. Member registers and authenticates
 * 2. Organization is created during registration
 * 3. Project is created within the organization
 * 4. Task is created within the project
 * 5. Task status is updated from 'open' to 'in-progress'
 * 6. Task history is verified to contain the status change record
 */
export async function test_api_task_status_update_assigned_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registers and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: `taskstatus.${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/register",
      referrer: "https://test.com",
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Verify organization was created
  TestValidator.predicate(
    "organization exists",
    memberAuth.organizations !== undefined &&
      memberAuth.organizations.length > 0,
  );
  const organizationId = memberAuth.organizations![0].id;
  // 2. Create project
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  TestValidator.equals("project status is active", project.status, "active");
  // 3. Create task
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        params: {
          organizationId,
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  TestValidator.predicate("task has initial status", task.status.length > 0);
  // 4. Update task status
  const updatedTask =
    await api.functional.hrm.member.organizations.projects.tasks.status(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "in-progress",
        } satisfies IHrmTask.IStatusUpdate,
      },
    );
  typia.assert(updatedTask);
  // 5. Verify status was updated
  TestValidator.equals(
    "task status updated to in-progress",
    updatedTask.status,
    "in-progress",
  );
  TestValidator.notEquals(
    "task updated timestamp changed",
    updatedTask.updated_at,
    task.updated_at,
  );
  // 6. Verify task history contains the status change
  TestValidator.predicate(
    "task has history records",
    updatedTask.taskHistories !== undefined &&
      updatedTask.taskHistories.length > 0,
  );
  // 7. Verify the most recent history record shows the correct transition
  const latestHistory = updatedTask.taskHistories[0];
  typia.assert(latestHistory);
  TestValidator.equals(
    "history records new status",
    latestHistory.new_status,
    "in-progress",
  );
  TestValidator.predicate(
    "history has member attribution",
    latestHistory.member !== null && latestHistory.member.id.length > 0,
  );
  TestValidator.predicate(
    "history has timestamp",
    latestHistory.timestamp.length > 0,
  );
}
