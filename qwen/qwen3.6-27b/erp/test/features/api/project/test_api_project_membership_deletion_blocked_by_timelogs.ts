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
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test project membership deletion is blocked when timelogs exist for the employee-project combination.
 *
 * Validates that the system prevents removal of project memberships when associated timelogs exist, preserving time tracking attribution integrity. The test verifies the complete workflow from setup through the expected failure, ensuring that the 409 Conflict response is returned when attempting to delete a membership with existing timelogs.
 *
 * Special attention is given to verifying proper connection isolation between the admin (with project:manage permission) and the employee (who creates the timelog), and that the membership record remains intact after the failed deletion attempt.
 *
 * 1. Admin member joins the platform (creates organization with owner permissions).
 * 2. Second member joins to serve as the employee account.
 * 3. Admin creates employee record linking the second member to the organization.
 * 4. Admin creates a project for time tracking.
 * 5. Admin creates project membership assigning the employee to the project.
 * 6. Employee (already authenticated from step 2) creates a timelog on the project.
 * 7. Admin attempts to delete the membership.
 * 8. Verify HTTP 409 Conflict is returned, blocking the deletion.
 */
export async function test_api_project_membership_deletion_blocked_by_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins (becomes owner with project:manage permission)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {} satisfies DeepPartial<IHrmPlatformMember.IJoin>,
  });
  typia.assert(adminConnection.headers?.Authorization);
  // 2. Second member joins to serve as employee account (keeps this connection for later)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeMemberAuthorized = await authorize_member_join(
    employeeConnection,
    {
      body: {} satisfies DeepPartial<IHrmPlatformMember.IJoin>,
    },
  );
  typia.assert(employeeMemberAuthorized);
  // 3. Admin creates employee record for the second member
  const employee = await generate_random_hrm_platform_member_employees_create(
    adminConnection,
    {
      body: {
        memberId: employeeMemberAuthorized.id,
      } satisfies DeepPartial<IHrmPlatformEmployee.ICreate>,
    },
  );
  typia.assert(employee);
  // 4. Admin creates a project
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {} satisfies DeepPartial<IHrmPlatformProject.ICreate>,
    },
  );
  typia.assert(project);
  // 5. Admin creates project membership for the employee
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      adminConnection,
      {
        body: {
          employeeId: employee.id,
        } satisfies DeepPartial<IHrmPlatformProjectMembership.ICreate>,
        params: { projectId: project.id },
      },
    );
  typia.assert(membership);
  // 6. Employee (using existing authenticated connection from step 2) creates a timelog on the project
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 60,
      } satisfies DeepPartial<IHrmPlatformTimelog.ICreate>,
    },
  );
  typia.assert(timelog);
  // 7 & 8. Admin attempts to delete membership - should fail with HTTP 409 Conflict
  await TestValidator.httpError(
    "membership deletion blocked by existing timelogs returns 409",
    409,
    async () =>
      await api.functional.hrmPlatform.member.projects.memberships.erase(
        adminConnection,
        {
          projectId: project.id,
          membershipId: membership.id,
        },
      ),
  );
}
