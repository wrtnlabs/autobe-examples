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
 * Test reassigning a running timer from one active project to another.
 *
 * Validates the complete timer project reassignment workflow where an employee has an active timer tracking time against a first project, and the timer is reassigned to a second project. Ensures that the timer remains active after the project change with stopped_at still NULL and deleted_at still NULL, and that the project field now references the second project. This validates that running timers can be reassigned to different active projects in real-time when work scope changes, maintaining continuous time tracking without interruption.
 *
 * Special attention is given to verifying that the timer state is preserved during reassignment, that the project reference is properly updated, and that the timer remains in active running status throughout the operation.
 *
 * 1. Authenticate a member via member_join for timer features.
 * 2. Create a role for employee assignment.
 * 3. Create an employee record for the authenticated member.
 * 4. Create a first active project for the initial timer.
 * 5. Assign the employee to the first project.
 * 6. Create a second active project as the update target.
 * 7. Assign the employee to the second project.
 * 8. Start an active timer on the first project.
 * 9. Reassign the running timer from the first project to the second project.
 * 10. Verify the timer remains active and the project field references second project.
 */
export async function test_api_timer_update_project_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. Create a role for employee assignment
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_member_roles_create(memberConnection, {
      body: {},
    });
  typia.assert(role);
  // 3. Create an employee record for the authenticated member
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(employee);
  // 4. Create first project for the initial timer
  const firstProject: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(firstProject);
  // 5. Assign employee to first project
  await generate_random_hrm_platform_member_projects_memberships_create(
    memberConnection,
    {
      body: {
        employeeId: employee.id,
        capacityRole: "member",
      } satisfies IHrmPlatformProjectMembership.ICreate,
      params: { projectId: firstProject.id },
    },
  );
  // 6. Create second project as the update target
  const secondProject: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(secondProject);
  // 7. Assign employee to second project
  await generate_random_hrm_platform_member_projects_memberships_create(
    memberConnection,
    {
      body: {
        employeeId: employee.id,
        capacityRole: "member",
      } satisfies IHrmPlatformProjectMembership.ICreate,
      params: { projectId: secondProject.id },
    },
  );
  // 8. Start an active timer on the first project
  const timer: IHrmPlatformTimer =
    await generate_random_hrm_platform_member_timers_create(memberConnection, {
      body: {
        project_id: firstProject.id,
      } satisfies IHrmPlatformTimer.ICreate,
    });
  typia.assert(timer);
  // 9. Reassign the running timer from the first project to the second project
  const updatedTimer: IHrmPlatformTimer =
    await api.functional.hrmPlatform.member.timers.update(memberConnection, {
      timerId: timer.id,
      body: {
        projectId: secondProject.id,
      } satisfies IHrmPlatformTimer.IUpdate,
    });
  typia.assert(updatedTimer);
  // 10. Verify the timer references the second project
  TestValidator.equals(
    "timer project matches second project",
    updatedTimer.project.id,
    secondProject.id,
  );
  TestValidator.predicate(
    "timer is still active (stopped_at is null)",
    updatedTimer.stopped_at === null,
  );
  TestValidator.predicate(
    "timer is not discarded (deleted_at is null)",
    updatedTimer.deleted_at === null,
  );
}
