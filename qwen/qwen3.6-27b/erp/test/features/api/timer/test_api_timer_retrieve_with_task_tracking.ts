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
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test timer retrieval with task tracking and nested entity relationships.
 *
 * Authenticates a member (which creates a default organization), creates an active project, creates a task within the project, starts a timer with project and task references, and retrieves the timer details. Validates all project and task summary details in the timer response.
 *
 * 1. Member registers and authenticates, creating a default organization.
 * 2. Creates an active project within the organization.
 * 3. Creates a task within the project.
 * 4. Starts a timer referencing both the project and task.
 * 5. Retrieves the timer by ID.
 * 6. Validates entity relationships including project and task references, with correct stopped_at and deleted_at are both null for the active state.
 */
export async function test_api_timer_retrieve_with_task_tracking(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(project);
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { title: RandomGenerator.paragraph({ sentences: 2 }) },
    },
  );
  typia.assert(task);
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        billable: true,
      },
    },
  );
  typia.assert(timer);
  const retrievedTimer = await api.functional.hrmPlatform.member.timers.at(
    memberConnection,
    { timerId: timer.id },
  );
  typia.assert(retrievedTimer);
  // Verify timer ID matches the created timer
  TestValidator.equals("timer ID matches", retrievedTimer.id, timer.id);
  // Verify project reference is correctly resolved
  TestValidator.equals(
    "project ID matches",
    retrievedTimer.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTimer.project.name,
    project.name,
  );
  TestValidator.predicate(
    "project status is Active",
    retrievedTimer.project.status === "Active",
  );
  TestValidator.predicate(
    "project organization ID is valid",
    retrievedTimer.project.organization.id.length > 0,
  );
  // Verify task reference is populated (not null) and contains correct data
  TestValidator.predicate("task is not null", retrievedTimer.task !== null);
  TestValidator.equals("task ID matches", retrievedTimer.task!.id, task.id);
  TestValidator.equals(
    "task title matches",
    retrievedTimer.task!.title,
    task.id,
  );
  TestValidator.equals(
    "task project ID matches",
    retrievedTimer.task!.project.id,
    project.id,
  );
  // Verify member and employee references
  TestValidator.predicate(
    "member display name exists",
    retrievedTimer.member.display_name.length > 0,
  );
  TestValidator.predicate(
    "employee is valid",
    retrievedTimer.employee.status === "active",
  );
  // Verify active timer state (started_at is populated, stopped_at and deleted_at are null)
  TestValidator.predicate(
    "started_at is populated",
    retrievedTimer.started_at.length > 0,
  );
  TestValidator.equals(
    "stopped_at is null for active timer",
    retrievedTimer.stopped_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active timer",
    retrievedTimer.deleted_at,
    null,
  );
  // Verify billable flag and description
  TestValidator.equals("billable flag matches", retrievedTimer.billable, true);
  TestValidator.predicate(
    "description is present",
    retrievedTimer.description !== null &&
      retrievedTimer.description.length > 0,
  );
}
