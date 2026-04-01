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
 * Test that a member can retrieve a task without an assignee.
 *
 * This test validates that task retrieval correctly handles tasks that have not
 * yet been assigned to any employee, ensuring the nullable assignee relationship
 * is properly serialized in the response with assignee field set to null.
 *
 * Workflow:
 * 1. Register a member account
 * 2. Create and select an organization
 * 3. Create a project
 * 4. Create a task without specifying an assignee
 * 5. Retrieve the task and validate assignee is null
 */
export async function test_api_task_retrieval_unassigned_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Select organization as active context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  // 4. Create project
  const project =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 5. Create task without assignee (hrm_platform_employee_id omitted)
  const taskCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "open",
    priority: "medium",
    estimated_hours: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
  } satisfies IHrmPlatformTask.ICreate;
  const createdTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        body: taskCreateBody,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(createdTask);
  // 6. Retrieve the unassigned task
  const retrievedTask =
    await api.functional.hrmPlatform.member.projects.tasks.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: createdTask.id,
      },
    );
  typia.assert(retrievedTask);
  // 7. Validate task details
  TestValidator.equals("task id matches", retrievedTask.id, createdTask.id);
  TestValidator.equals(
    "task title matches",
    retrievedTask.title,
    taskCreateBody.title,
  );
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    taskCreateBody.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    taskCreateBody.priority,
  );
  TestValidator.equals(
    "project id matches",
    retrievedTask.project.id,
    project.id,
  );
  // Critical: Validate assignee is null for unassigned task
  TestValidator.equals(
    "assignee is null for unassigned task",
    retrievedTask.assignee,
    null,
  );
  // Validate other fields are properly populated
  TestValidator.predicate(
    "description is present",
    retrievedTask.description !== null,
  );
  TestValidator.predicate(
    "estimated_hours is positive",
    (retrievedTask.estimated_hours ?? 0) > 0,
  );
  TestValidator.predicate("due_date is set", retrievedTask.due_date !== null);
  TestValidator.predicate(
    "created_at is valid",
    retrievedTask.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedTask.updated_at !== null,
  );
  TestValidator.equals("deleted_at is null", retrievedTask.deleted_at, null);
  // Validate aggregate counts
  TestValidator.equals(
    "histories_count is zero",
    retrievedTask.histories_count,
    0,
  );
  TestValidator.equals(
    "timelogs_count is zero",
    retrievedTask.timelogs_count,
    0,
  );
  TestValidator.equals("timers_count is zero", retrievedTask.timers_count, 0);
  // Validate subtasks array
  TestValidator.equals(
    "subtasks is empty array",
    retrievedTask.subtasks.length,
    0,
  );
  // Validate parentTask is null for top-level task
  TestValidator.equals("parentTask is null", retrievedTask.parentTask, null);
}