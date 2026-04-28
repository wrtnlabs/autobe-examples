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
 * Test retroactive time entry creation for a past date.
 *
 * Validates that an employee can log work time retroactively for a previous calendar date, which is a common use case for employees catching up on missed time tracking. The timelog is created with a date set to 3 days before the current date, and the system is expected to accept this historical date entry.
 *
 * The test ensures that the timelog is successfully created with the past date, the date field correctly reflects the retroactive calendar date, and the entry follows standard creation business rules (active employee, active project, valid project membership).
 *
 * 1. Member authenticates by joining the platform to establish their session context.
 * 2. An active project is created for the member's organization to enable time tracking.
 * 3. An employee record is created linking the member to the organization with role assignment.
 * 4. The employee is assigned as a member to the project to enable time logging.
 * 5. A retroactive timelog is created with date set to 3 days in the past.
 * 6. Validates that the timelog date correctly reflects the retroactive past date.
 */
export async function test_api_timelog_creation_retroactive_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - join to create account and establish session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create active project for time tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    { body: { memberId: authorized.id } },
  );
  typia.assert(employee);
  // 4. Assign employee to the project to enable time logging
  await generate_random_hrm_platform_member_projects_memberships_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { employeeId: employee.id },
    },
  );
  // 5. Calculate retroactive date (3 days in the past)
  const retroactiveDate = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 6. Create timelog with retroactive date
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    { body: { date: retroactiveDate, projectId: project.id } },
  );
  typia.assert(timelog);
  // 7. Validate that the timelog date reflects the retroactive date
  TestValidator.equals(
    "timelog date matches retroactive date",
    timelog.date.slice(0, 10),
    retroactiveDate.slice(0, 10),
  );
}
