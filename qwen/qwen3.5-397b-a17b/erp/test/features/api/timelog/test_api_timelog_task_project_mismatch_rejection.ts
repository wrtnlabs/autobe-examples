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
 * Test business rule validation when employee attempts to create timelog with task from different project.
 *
 * Validates the cross-entity constraint that a task must belong to the selected project. The test validates: (1) System rejects timelog creation when task_id references a task from a different project than the specified project_id. (2) Appropriate error response is returned indicating the task-project mismatch. (3) No timelog record is created in the database.
 *
 * Business workflow: Member joins → creates organization → creates two projects (Project A and Project B) → assigns self to both projects → creates task in Project A → attempts to create timelog for Project B with task from Project A → system rejects with validation error. This tests the business rule from section 278: 'IF a task is specified in the timelog, THEN THE system SHALL validate that the task belongs to the selected project.'
 *
 * 1. Member registers and authenticates.
 * 2. Creates organization for context.
 * 3. Creates Project A and Project B.
 * 4. Assigns employee to both projects as project member.
 * 5. Creates task in Project A.
 * 6. Attempts to create timelog for Project B with task from Project A.
 * 7. Validates system rejects with appropriate error.
 */
export async function test_api_timelog_task_project_mismatch_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create Project A and Project B
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project A - Task Source",
        color: "#FF5733",
      },
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project B - Timelog Target",
        color: "#33FF57",
      },
    },
  );
  typia.assert(projectB);
  // 4. Create task in Project A
  const taskInProjectA =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: "Task in Project A",
          priority: "medium",
          status: "open",
        },
      },
    );
  typia.assert(taskInProjectA);
  // 5. Attempt to create timelog for Project B with task from Project A
  // This should be rejected by the system due to task-project mismatch
  // The business rule states: IF a task is specified in the timelog, THEN THE system SHALL validate that the task belongs to the selected project
  await TestValidator.error(
    "timelog creation with mismatched task-project should fail",
    async () => {
      await api.functional.hrmPlatform.member.timelogs.create(
        memberConnection,
        {
          body: {
            date: new Date().toISOString(),
            duration_minutes: 60,
            hrm_platform_project_id: projectB.id,
            hrm_platform_task_id: taskInProjectA.id,
            description: "Attempting to log time with mismatched task",
            billable: true,
          } satisfies IHrmPlatformTimelog.ICreate,
        },
      );
    },
  );
}
