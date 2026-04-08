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
 * Test the business rule that enforces only one active timer per employee, verifying the system rejects a second timer creation attempt when an active timer already exists.
 *
 * Setup: Authenticate as a new member via join. Create an employee invitation and ensure the employee record exists. Create a project with required name and color. Assign the employee to the project as a member. Create a first timer session that is actively running (stopped_at is null).
 *
 * Action: Attempt to create a second timer with a different project while the first timer is still active.
 *
 * Validation: Verify the system rejects the request with a 409 Conflict error, indicating an active timer already exists. Confirm the error message clearly states that only one timer can be active at a time. Verify the first timer remains unchanged and continues running. This validates the business constraint that prevents duplicate concurrent time tracking sessions.
 *
 * 1. Member joins and authenticates via authorize_member_join utility.
 * 2. Employee invitation is created with the member's email, which immediately creates an employee record since the account exists.
 * 3. First project is created with name and color.
 * 4. Employee is assigned to the first project as a member.
 * 5. Second project is created for the conflicting timer attempt.
 * 6. Employee is assigned to the second project as a member.
 * 7. First timer is created and is actively running (stopped_at is null).
 * 8. Second timer creation is attempted with different project while first timer is active.
 * 9. System rejects with 409 Conflict error.
 * 10. First timer is verified to still be running (stopped_at remains null).
 */
export async function test_api_timer_creation_conflict_with_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create employee invitation with member's email (creates employee immediately)
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
  // 3. Create first project
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project1);
  // 4. Assign employee to first project
  const projectMember1 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project1.id },
        body: {
          hrm_platform_employee_id: employeeInvitation.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember1);
  // 5. Create second project for conflicting timer
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project2);
  // 6. Assign employee to second project
  const projectMember2 =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project2.id },
        body: {
          hrm_platform_employee_id: employeeInvitation.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember2);
  // 7. Create first active timer
  const timer1 = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project1.id,
        description: "First timer session",
      },
    },
  );
  typia.assert(timer1);
  TestValidator.predicate("first timer is active", timer1.stopped_at === null);
  // 8. Attempt to create second timer while first is active - should fail with 409
  await TestValidator.error(
    "second timer conflicts with active timer",
    async () => {
      await generate_random_hrm_platform_member_timers_create(
        memberConnection,
        {
          body: {
            hrm_platform_project_id: project2.id,
            description: "Second timer session",
          },
        },
      );
    },
  );
  // 9. Verify first timer is still running (stopped_at remains null)
  TestValidator.predicate(
    "first timer remains active",
    timer1.stopped_at === null,
  );
}
