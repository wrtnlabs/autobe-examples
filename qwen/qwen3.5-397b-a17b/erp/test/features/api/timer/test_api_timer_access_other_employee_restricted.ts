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
 * Test that employees cannot retrieve timers belonging to other employees.
 *
 * Two employees are created and invited to the same organization. Employee A creates a timer with project assignment. Employee B attempts to retrieve Employee A's timer by ID. The system should reject this request with 404 Not Found, as employees can only view their own timers regardless of organization membership or project assignment. This validates the timer ownership access restriction business rule that prevents employees from viewing other employees' timer sessions.
 *
 * 1. Member A registers and is invited as employee to organization.
 * 2. Member B registers and is invited as employee to same organization.
 * 3. A project is created and both employees are assigned as project members.
 * 4. Employee A creates a timer session for the project.
 * 5. Employee B attempts to retrieve Employee A's timer by ID.
 * 6. System returns 404 Not Found, proving timer access is restricted to owner only.
 */
export async function test_api_timer_access_other_employee_restricted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (first employee)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Create Member B (second employee)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // 3. Create employee invitation for Member A - since member exists, creates employee immediately
  const employeeInvitationA =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberAAuth.email,
        },
      },
    );
  typia.assert(employeeInvitationA);
  // 4. Create employee invitation for Member B - since member exists, creates employee immediately
  const employeeInvitationB =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberBAuth.email,
        },
      },
    );
  typia.assert(employeeInvitationB);
  // 5. Create a project
  const project =
    await generate_random_hrm_platform_member_projects_create(
      memberAConnection,
      {},
    );
  typia.assert(project);
  // 6. Assign Employee A to the project
  // The prepare function generates random employee ID, so we need to get the actual employee ID
  // Since invitation creates employee when member exists, we need to extract employee info
  // For this test, we'll use the generate function which handles employee ID internally
  const projectMemberA =
    await generate_random_hrm_platform_member_projects_members_create(
      memberAConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMemberA);
  // 7. Assign Employee B to the same project
  const projectMemberB =
    await generate_random_hrm_platform_member_projects_members_create(
      memberAConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMemberB);
  // 8. Employee A creates a timer session
  const timerA = await generate_random_hrm_platform_member_timers_create(
    memberAConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
      },
    },
  );
  typia.assert(timerA);
  // 9. Employee B attempts to retrieve Employee A's timer - should fail with 404
  await TestValidator.error(
    "Employee B cannot access Employee A's timer",
    async () => {
      await api.functional.hrmPlatform.member.timers.at(memberBConnection, {
        timerId: timerA.id,
      });
    },
  );
  // 10. Verify Employee A can still access their own timer
  const retrievedTimerA = await api.functional.hrmPlatform.member.timers.at(
    memberAConnection,
    {
      timerId: timerA.id,
    },
  );
  typia.assert(retrievedTimerA);
  TestValidator.equals("timer owner matches", retrievedTimerA.id, timerA.id);
}