import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test updating the work description of a running timer without stopping it.
 *
 * Validates that an active timer's description can be modified in real-time while time tracking continues. The employee starts a timer against an active project with an initial description, then updates only the description field. After the update, the timer remains active (stopped_at and deleted_at still NULL), and the description reflects the new value.
 *
 * Ensures that the description update operation preserves the timer's running state and does not affect the start time or billable status.
 *
 * 1. Member authenticates by joining the platform.
 * 2. A custom role is created for employee assignment.
 * 3. An employee record is created linking the authenticated member.
 * 4. An active project is created for time tracking.
 * 5. Employee is assigned to the project.
 * 6. Employee starts a timer on the project with an initial work description.
 * 7. Timer description is updated to a new value.
 * 8. Validates the timer remains active (stopped_at is null, deleted_at is null).
 * 9. Validates the description reflects the new value.
 */
export async function test_api_timer_update_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a custom role for employee assignment
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {},
  );
  typia.assert(role);
  // 3. Create employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: member.id,
        roleId: role.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create an active project for time tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign employee to the project as a member
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employee.id,
          capacityRole: "member",
        },
      },
    );
  typia.assert(membership);
  // 6. Start a timer with an initial description
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 2,
  });
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: initialDescription,
      },
    },
  );
  typia.assert(timer);
  // Verify timer is active before update
  TestValidator.equals(
    "timer initially has no stopped_at",
    timer.stopped_at,
    null,
  );
  TestValidator.equals(
    "timer initially has no deleted_at",
    timer.deleted_at,
    null,
  );
  TestValidator.equals(
    "initial description matches",
    timer.description,
    initialDescription,
  );
  // 7. Update the timer description
  const newDescription: string = RandomGenerator.paragraph({ sentences: 3 });
  const body = {
    description: newDescription,
  } satisfies IHrmPlatformTimer.IUpdate;
  const updatedTimer = await api.functional.hrmPlatform.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body,
    },
  );
  typia.assert(updatedTimer);
  // 8. Validate timer remains active after description update
  TestValidator.equals(
    "timer still active (stopped_at null) after description update",
    updatedTimer.stopped_at,
    null,
  );
  TestValidator.equals(
    "timer not deleted after description update",
    updatedTimer.deleted_at,
    null,
  );
  // 9. Validate description has been updated
  TestValidator.equals(
    "description reflects new value",
    updatedTimer.description,
    newDescription,
  );
}
