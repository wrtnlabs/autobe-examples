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
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test stopping a running timer that tracks work at both project and task level.
 *
 * Validates the complete timer lifecycle from creation through stopping, ensuring that the resulting timelog correctly inherits all context from the stopped timer including project, task, and description. The test verifies that duration is calculated, billable defaults to true, and the timelog date matches the timer's start date.
 *
 * Special attention is given to verifying that the project and task references are correctly maintained through the timer-to-timelog transition, and that the duration_minutes field contains a positive value representing the elapsed time.
 *
 * 1. Member authenticates via join to obtain access token.
 * 2. Employee invitation is created and accepted (employee record created).
 * 3. Project is created within the organization.
 * 4. Employee is assigned to the project as a project member.
 * 5. Task is created within the project.
 * 6. Timer is started with the project, task, and description.
 * 7. Timer is stopped via POST /hrmPlatform/member/timers/active/stop.
 * 8. Validates timelog inherits project, task, description, and has positive duration.
 */
export async function test_api_timer_stop_with_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create employee invitation (auto-accepted since member exists)
  const employeeInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: member.email,
        },
      },
    );
  typia.assert(employeeInvitation);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Assign employee to project as project member
  // Extract employee ID from the invitation - when member exists, employee is created
  // The employee ID can be accessed through the relation in the response
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
  // 5. Create task within the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 6. Start timer with project, task, and description
  const timerDescription = RandomGenerator.paragraph({ sentences: 3 });
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: task.id,
        description: timerDescription,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Small delay to ensure duration > 0
  await new Promise((resolve) => setTimeout(resolve, 1100));
  // 7. Stop the timer
  const timelog =
    await api.functional.hrmPlatform.member.timers.active.stop(
      memberConnection,
    );
  typia.assert(timelog);
  // 8. Validate timelog inherits all context from timer
  TestValidator.equals(
    "timelog project matches timer project",
    timelog.project.id,
    project.id,
  );
  TestValidator.predicate(
    "timelog task exists and matches timer task",
    timelog.task !== null &&
      timelog.task !== undefined &&
      timelog.task.id === task.id,
  );
  TestValidator.equals(
    "timelog description matches timer description",
    timelog.description,
    timerDescription,
  );
  TestValidator.predicate(
    "timelog duration is positive",
    timelog.duration_minutes > 0,
  );
  TestValidator.predicate(
    "timelog is billable by default",
    timelog.billable === true,
  );
  TestValidator.predicate(
    "timelog date matches timer started_at date",
    timelog.date.startsWith(timer.started_at.substring(0, 10)),
  );
}
