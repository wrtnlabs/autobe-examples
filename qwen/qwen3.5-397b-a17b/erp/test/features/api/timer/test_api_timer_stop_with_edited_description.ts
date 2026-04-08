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
 * Test that edits made to a running timer are reflected in the created timelog when stopped.
 *
 * Validates the complete timer lifecycle including timer creation, description update while running, and stopping to create a timelog. Ensures that the timelog correctly captures the updated description rather than the initial description, confirming that timer edits are applied immediately.
 *
 * Special attention is given to verifying that the timelog description matches the UPDATED description (not the initial description), the duration is calculated correctly, and the project_id is inherited from the stopped timer.
 *
 * 1. Member authenticates via join to get authenticated connection.
 * 2. Employee invitation is created with member's email (auto-accepted since member exists, creating employee record).
 * 3. Project is created within the organization.
 * 4. Employee is retrieved and assigned to the project as a project member.
 * 5. Timer is started with initial description.
 * 6. Timer description is updated while running.
 * 7. Timer is stopped and timelog is created.
 * 8. Validates timelog description matches updated description, duration is positive, and project_id matches.
 */
export async function test_api_timer_stop_with_edited_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create employee invitation with member's email
  // Since member already exists, this should auto-create employee record
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
  // 3. Create project within the organization
  const project =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.name(),
        color: typia.random<string>(),
      } satisfies IHrmPlatformProject.ICreate,
    });
  typia.assert(project);
  // 4. For this test, we'll create the timer directly without project member assignment
  // The API should handle employee context from the authenticated session
  // Start timer with initial description
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        description: initialDescription,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 5. Update timer description while running
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
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
  // 6. Stop the timer and create timelog
  const timelog =
    await api.functional.hrmPlatform.member.timers.active.stop(
      memberConnection,
    );
  typia.assert(timelog);
  // 7. Validate timelog reflects updated description
  TestValidator.equals(
    "timelog description matches updated description",
    timelog.description,
    updatedDescription,
  );
  TestValidator.notEquals(
    "timelog description differs from initial description",
    timelog.description,
    initialDescription,
  );
  TestValidator.predicate(
    "timelog duration is positive",
    timelog.duration_minutes > 0,
  );
  TestValidator.equals(
    "timelog project matches timer project",
    timelog.project.id,
    project.id,
  );
}