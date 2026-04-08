import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test stopping a timer that tracks work at project level only (no task assigned).
 *
 * Validates the complete timer lifecycle from creation to stop when tracking time at project level without a specific task. This scenario is common for general project work, administrative tasks, or when the specific task is not yet determined.
 *
 * The test ensures that the timer stop operation correctly creates a timelog entry with the project reference, null task field, inherited description, and properly calculated duration. The billable flag defaults to true for all timelogs created from stopped timers.
 *
 * 1. Member authenticates via join to obtain access token.
 * 2. Employee invitation is created and accepted (employee record created).
 * 3. Project is created within the organization.
 * 4. Employee is assigned to the project as a project member.
 * 5. Timer is started with only project reference (task_id is null) and description.
 * 6. Timer is stopped via POST /hrmPlatform/member/timers/active/stop.
 * 7. Validates timelog has correct project_id, null task, inherited description, billable=true, and positive duration.
 */
export async function test_api_timer_stop_project_level_without_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create employee invitation (creates employee record since member exists)
  const employeeInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: memberAuth.email,
        },
      },
    );
  typia.assert(employeeInvitation);
  // 3. Create a project
  const project =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        color: typia.random<string>(),
      } satisfies IHrmPlatformProject.ICreate,
    });
  typia.assert(project);
  // 4. Assign employee to project as project member
  // When member exists, invitation returns employee record with employee ID
  // The employeeInvitation contains the employee information
  const employeeId = employeeInvitation.id;
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeId,
          role: "member",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Start a timer with only project (no task)
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: null,
        description: timerDescription,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 6. Stop the timer
  const timelog =
    await api.functional.hrmPlatform.member.timers.active.stop(
      memberConnection,
    );
  typia.assert(timelog);
  // 7. Validate timelog
  TestValidator.equals(
    "timelog project matches timer project",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog task is null (no task assigned)",
    timelog.task ?? null,
    null,
  );
  TestValidator.equals(
    "timelog description matches timer description",
    timelog.description ?? null,
    timerDescription,
  );
  TestValidator.equals(
    "timelog billable defaults to true",
    timelog.billable,
    true,
  );
  TestValidator.predicate(
    "timelog duration is positive",
    timelog.duration_minutes > 0,
  );
  TestValidator.predicate(
    "timelog date is valid",
    timelog.date !== null && timelog.date !== undefined,
  );
}