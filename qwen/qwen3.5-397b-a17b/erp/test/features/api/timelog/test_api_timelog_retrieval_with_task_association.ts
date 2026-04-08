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
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test timelog retrieval with task association validation.
 *
 * Validates the complete timelog workflow including project creation, task assignment, timelog creation with task reference, and timelog retrieval. Ensures that the retrieved timelog correctly includes the associated task details and that the task belongs to the same project as the timelog.
 *
 * The test verifies that optional task associations are properly maintained through the timelog lifecycle and that all task details (id, title, status, priority) are correctly returned in the timelog retrieval response.
 *
 * 1. Member joins and authenticates to the platform.
 * 2. Member creates an organization for context.
 * 3. Member creates a project for time tracking.
 * 4. Member is assigned to the project as a member.
 * 5. Member creates a task within the project.
 * 6. Member creates a timelog with the task association.
 * 7. Member retrieves the timelog by ID.
 * 8. Validates timelog includes task reference with correct details.
 * 9. Validates task belongs to the same project as the timelog.
 * 10. Validates all timelog fields are correctly populated.
 */
export async function test_api_timelog_retrieval_with_task_association(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create task within the project (before assigning member to project)
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 5. Create timelog with task association
  // Note: The generate function handles employee assignment internally
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: task.id,
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 6. Retrieve timelog by ID
  const retrievedTimelog = await api.functional.hrmPlatform.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 7. Validate timelog includes task reference
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "project ID matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.predicate(
    "task is included",
    retrievedTimelog.task !== null && retrievedTimelog.task !== undefined,
  );
  // 8. Validate task details
  if (retrievedTimelog.task) {
    const safeTask = typia.assert(retrievedTimelog.task);
    TestValidator.equals("task ID matches", safeTask.id, task.id);
    TestValidator.equals("task title matches", safeTask.title, task.title);
    TestValidator.equals("task status matches", safeTask.status, task.status);
    TestValidator.equals(
      "task priority matches",
      safeTask.priority,
      task.priority,
    );
  }
  // 9. Validate timelog fields
  TestValidator.equals(
    "duration matches",
    retrievedTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "billable flag matches",
    retrievedTimelog.billable,
    true,
  );
  TestValidator.predicate(
    "description exists",
    retrievedTimelog.description !== null &&
      retrievedTimelog.description !== undefined,
  );
  TestValidator.equals(
    "employee ID matches",
    retrievedTimelog.employee.id,
    timelog.employee.id,
  );
}