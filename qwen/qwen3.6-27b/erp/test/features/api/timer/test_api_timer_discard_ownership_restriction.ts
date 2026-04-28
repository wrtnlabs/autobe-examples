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
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test that discarding a timer is restricted to the timer owner, verifying authorization enforcement.
 *
 * Validates the security constraint that prevents authenticated members from discarding timers they do not own. When an employee starts a timer, only that specific employee can discard it; attempts by other employees—even those in the same organization and project—must be rejected with a 403 Forbidden error.
 *
 * This test establishes two separate member accounts within the same organization, starts a timer as one employee, and attempts to discard that timer using the other member's authenticated session. The authorization check compares the authenticated member's active employee record against the timer's employee assignment.
 *
 * 1. Authenticate Member A who will create and own the timer.
 * 2. Authenticate Member B who will attempt the unauthorized discard.
 * 3. Create a project within Member A's organization context.
 * 4. Create employee record for Member A within their organization.
 * 5. Create employee record for Member B within Member A's organization.
 * 6. Assign both employees to the same project with member capacity.
 * 7. Start a timer as Member A's employee, linking it to the project.
 * 8. Attempt to discard the timer as Member B's employee.
 * 9. Verify the discard request is rejected with 403 Forbidden, confirming ownership restriction.
 */
export async function test_api_timer_discard_ownership_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate Member A (timer owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Authenticate Member B (will attempt unauthorized discard)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Create project within Member A's organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 4. Create employee record for Member A within their organization
  const employeeA = await generate_random_hrm_platform_member_employees_create(
    memberAConnection,
    {
      body: {
        memberId: memberA.id,
      },
    },
  );
  typia.assert(employeeA);
  // 5. Create employee record for Member B within Member A's organization using Member A's connection (organization context)
  const employeeB = await generate_random_hrm_platform_member_employees_create(
    memberAConnection,
    {
      body: {
        memberId: memberB.id,
        roleId: employeeA.role.id,
      },
    },
  );
  typia.assert(employeeB);
  // 6. Assign employee A to project as member
  const membershipA =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberAConnection,
      {
        body: {
          employeeId: employeeA.id,
          capacityRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  // Assign employee B to project as member
  const membershipB =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberAConnection,
      {
        body: {
          employeeId: employeeB.id,
          capacityRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  // 7. Start timer as Member A's employee linked to the project
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberAConnection,
    {
      body: {
        project_id: project.id,
      },
    },
  );
  typia.assert(timer);
  // 8. Attempt to discard the timer as Member B (unauthorized)
  // The timer belongs to employee A, so employee B should receive 403 Forbidden
  await TestValidator.httpError(
    "timer discard owned by another employee",
    403,
    async () => {
      await api.functional.hrmPlatform.member.timers.erase(memberBConnection, {
        timerId: timer.id,
      });
    },
  );
}
