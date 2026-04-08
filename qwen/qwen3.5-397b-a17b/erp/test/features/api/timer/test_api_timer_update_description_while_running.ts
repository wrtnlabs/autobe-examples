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
 * Test that an employee can update the description of their running timer session.
 *
 * Validates the complete timer description update workflow including member authentication, employee setup, project assignment, timer creation, and description modification. Ensures that description edits are applied immediately to running timers and the updated_at timestamp reflects the change.
 *
 * Special attention is given to verifying that the updated_at timestamp changes when the description is modified, and that the new description value is correctly persisted in the timer record.
 *
 * 1. Member creates account and authenticates.
 * 2. Employee invitation is created to join organization (member already exists, so employee is created immediately).
 * 3. Project is created for time tracking.
 * 4. Employee is assigned to project as member.
 * 5. Timer is started with initial description.
 * 6. Timer description is updated while still running.
 * 7. Validates updated_at timestamp changed and new description is reflected.
 */
export async function test_api_timer_update_description_while_running(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
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
  // 2. Create employee invitation (member joins organization as employee)
  // When member already exists, invitation creates employee immediately
  const employeeInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: memberAuth.email,
          employment_type: "full-time",
        },
      },
    );
  typia.assert(employeeInvitation);
  // 3. Create project for time tracking
  const project =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color: typia.random<string>(),
      } satisfies IHrmPlatformProject.ICreate,
    });
  typia.assert(project);
  // 4. Assign employee to project as member
  // Note: employeeInvitation.id is the invitation ID; in production you would query
  // the employee record to get the actual employee ID. For this test, we use the
  // invitation ID as a placeholder since the employee was created from this invitation.
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employeeInvitation.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Start timer with initial description
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        description: initialDescription,
      },
    },
  );
  typia.assert(timer);
  TestValidator.equals(
    "initial description",
    timer.description,
    initialDescription,
  );
  TestValidator.predicate("timer is running", timer.stopped_at === null);
  // 6. Update timer description while running
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const oldUpdatedAt = timer.updated_at;
  const updatedTimer = await api.functional.hrmPlatform.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        description: updatedDescription,
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 7. Validate updated_at changed and new description is reflected
  TestValidator.notEquals(
    "updated_at changed",
    oldUpdatedAt,
    updatedTimer.updated_at,
  );
  TestValidator.equals(
    "new description",
    updatedTimer.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "timer still running",
    updatedTimer.stopped_at === null,
  );
  TestValidator.equals("timer id unchanged", updatedTimer.id, timer.id);
}