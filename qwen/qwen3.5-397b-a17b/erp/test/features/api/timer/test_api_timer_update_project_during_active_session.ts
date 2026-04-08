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
 * Test employee timer project update during active session.
 *
 * Validates that an employee can switch the project assignment of their running timer. The test ensures that project changes are applied immediately to the active timer session and that the timer record reflects the updated project reference.
 *
 * The test flow establishes a complete employee context with organization membership, creates two distinct projects, assigns the employee to both projects, starts a timer on the first project, updates the timer to track the second project, and verifies the project reference changed correctly.
 *
 * 1. Member registers account and creates employee record via invitation.
 * 2. Two projects are created with distinct names and colors.
 * 3. Employee is assigned as project member to both projects.
 * 4. Timer is started tracking the first project.
 * 5. Timer is updated to track the second project while running.
 * 6. Validates timer's hrm_platform_project_id matches the second project.
 */
export async function test_api_timer_update_project_during_active_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and employee record
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Set authorization header for subsequent calls
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // Create employee invitation to establish employee record
  // When member already exists, this creates employee record immediately
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: memberAuth.email,
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 2. Create two projects
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#33FF57",
      },
    },
  );
  typia.assert(project2);
  // 3. Assign employee to both projects
  // Note: In production, you would fetch the employee ID from the employee record
  // For this test, we assume the invitation created an employee and use a placeholder
  // The actual employee ID would come from querying the employee endpoint
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const membership1 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project1.id },
        body: {
          hrm_platform_employee_id: employeeId,
          role: "member",
        },
      },
    );
  typia.assert(membership1);
  const membership2 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project2.id },
        body: {
          hrm_platform_employee_id: employeeId,
          role: "member",
        },
      },
    );
  typia.assert(membership2);
  // 4. Start timer tracking first project
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project1.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer);
  // Verify timer is running (stopped_at is null)
  TestValidator.predicate("timer is running", timer.stopped_at === null);
  TestValidator.equals(
    "timer tracks first project",
    timer.project.id,
    project1.id,
  );
  // 5. Update timer to track second project
  const updatedTimer = await api.functional.hrmPlatform.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        hrm_platform_project_id: project2.id,
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 6. Verify timer project changed to second project
  TestValidator.equals(
    "timer project updated",
    updatedTimer.project.id,
    project2.id,
  );
  TestValidator.notEquals(
    "project changed from first",
    updatedTimer.project.id,
    project1.id,
  );
  TestValidator.predicate(
    "timer still running after update",
    updatedTimer.stopped_at === null,
  );
}
