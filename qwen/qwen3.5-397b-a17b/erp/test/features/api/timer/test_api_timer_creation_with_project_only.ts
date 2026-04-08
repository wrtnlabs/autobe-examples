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
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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
 * Test timer creation with project-level tracking only (no task specified).
 *
 * Validates the complete timer creation flow when an employee tracks time at the project level without associating it to a specific task. This tests the primary success path where hrm_platform_task_id is intentionally left null to track general project work.
 *
 * The test ensures that the timer correctly references the project, maintains null task reference, sets appropriate timestamps (started_at to current time, stopped_at as null for active timer), and properly stores the optional description field.
 *
 * 1. Member joins the platform with unique email and password credentials.
 * 2. Employee invitation is created for the member's email, which immediately creates an employee record since the member already exists.
 * 3. A project is created with required name and hex color code.
 * 4. The employee is assigned to the project as a member with 'member' role.
 * 5. A timer is created with only the hrm_platform_project_id, leaving hrm_platform_task_id as null.
 * 6. Validate timer has correct project reference, null task, valid started_at timestamp, stopped_at is null, and description matches input.
 */
export async function test_api_timer_creation_with_project_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
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
  // 2. Create employee invitation (member already exists, so employee is created immediately)
  // When member exists, the API returns the employee record instead of invitation
  const employeeResult =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: member.email,
        },
      },
    );
  typia.assert(employeeResult);
  // Extract employee ID from the response
  // When member exists, response contains employee data with id field
  const employeeId = employeeResult.id;
  // 3. Create a project
  const project =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        color: `#${randint(0, 16777215).toString(16).padStart(6, '0')}`,
      },
    });
  typia.assert(project);
  // 4. Assign employee to project as member
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employeeId,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create timer with project only (no task)
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: null,
        description: timerDescription,
      },
    },
  );
  typia.assert(timer);
  // 6. Validate timer
  TestValidator.equals("timer project matches", timer.project.id, project.id);
  TestValidator.equals("timer task is null", timer.task, null);
  TestValidator.predicate(
    "timer started_at is valid timestamp",
    () => new Date(timer.started_at).getTime() > 0,
  );
  TestValidator.equals(
    "timer stopped_at is null (active)",
    timer.stopped_at,
    null,
  );
  TestValidator.equals(
    "timer description matches",
    timer.description,
    timerDescription,
  );
  TestValidator.equals(
    "timer employee matches",
    timer.employee.id,
    projectMember.employee.id,
  );
}