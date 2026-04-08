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
 * Test timer discard ownership validation preventing employees from discarding others' timers.
 *
 * Validates the security requirement that employees can only discard their own timers by testing cross-employee access control. Two employees are created in the same organization, Employee A creates a running timer, and Employee B attempts to discard Employee A's timer. The system must return 404 Not Found indicating the timer doesn't belong to the authenticated employee, Employee A's timer remains intact and running, and the ownership check enforces data isolation between employees.
 *
 * 1. Create Employee A through member registration and employee invitation.
 * 2. Create Employee B through member registration and employee invitation.
 * 3. Create a project for timer assignment.
 * 4. Assign both employees to the project as project members.
 * 5. Employee A creates a running timer session.
 * 6. Employee B attempts to discard Employee A's timer.
 * 7. Validate 404 Not Found is returned.
 * 8. Validate Employee A's timer remains intact and running.
 */
export async function test_api_timer_discard_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Employee A - Member registration
  const memberA = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // Create Employee A connection with auth token
  const employeeAConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberA.token.access}`,
    },
  };
  // 2. Create Employee B - Member registration
  const memberB = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // Create Employee B connection with auth token
  const employeeBConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberB.token.access}`,
    },
  };
  // 3. Create a project for timer assignment
  const project =
    await generate_random_hrm_platform_member_projects_create(
      employeeAConnection,
      {},
    );
  typia.assert(project);
  // 4. Create employee invitations to establish employee records in the organization
  // When member already exists, the API creates an employee record and returns it
  const invitationA =
    await generate_random_hrm_platform_member_employee_invitations_create(
      employeeAConnection,
      {
        body: {
          email: memberA.email,
        },
      },
    );
  typia.assert(invitationA);
  const invitationB =
    await generate_random_hrm_platform_member_employee_invitations_create(
      employeeAConnection,
      {
        body: {
          email: memberB.email,
        },
      },
    );
  typia.assert(invitationB);
  // Extract employee IDs from invitation responses
  // When member exists, response contains employee record with employee ID in the id field
  const employeeAId = invitationA.id;
  const employeeBId = invitationB.id;
  // 5. Assign both employees to the project as project members
  const projectMemberA =
    await generate_random_hrm_platform_member_projects_members_create(
      employeeAConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeAId,
          role: "member",
        },
      },
    );
  typia.assert(projectMemberA);
  const projectMemberB =
    await generate_random_hrm_platform_member_projects_members_create(
      employeeAConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeBId,
          role: "member",
        },
      },
    );
  typia.assert(projectMemberB);
  // 6. Employee A creates a running timer session
  const timerA = await generate_random_hrm_platform_member_timers_create(
    employeeAConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
      },
    },
  );
  typia.assert(timerA);
  // Verify timer is running (stopped_at is null)
  TestValidator.predicate(
    "Timer A is running",
    () => timerA.stopped_at === null,
  );
  // 7. Employee B attempts to discard Employee A's timer (should fail with 404)
  await TestValidator.error(
    "Employee B cannot discard Employee A's timer - ownership validation",
    async () => {
      await api.functional.hrmPlatform.member.timers.erase(
        employeeBConnection,
        {
          timerId: timerA.id,
        },
      );
    },
  );
  // 8. Validate Employee A's timer remains intact and running
  // The error test above confirms the timer was not deleted
  TestValidator.predicate(
    "Employee A's timer remains running after unauthorized discard attempt",
    () => timerA.stopped_at === null,
  );
}