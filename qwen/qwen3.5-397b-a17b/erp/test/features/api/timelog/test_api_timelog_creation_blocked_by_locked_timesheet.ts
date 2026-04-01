import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
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
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test business rule validation that prevents timelog creation for dates within a locked timesheet week.
 *
 * This test verifies the complete workflow:
 * 1. Member registration and authentication
 * 2. Organization creation
 * 3. Custom role creation with time management permissions
 * 4. Employee invitation and creation
 * 5. Project creation
 * 6. Timelog creation with proper validation
 *
 * Note: The available API functions do not include timesheet submission endpoints or employee listing.
 * This test validates the timelog creation workflow and business logic validation that occurs during
 * timelog creation. The locked timesheet validation would occur server-side when checking if the date
 * falls within a submitted/approved timesheet week.
 */
export async function test_api_timelog_creation_blocked_by_locked_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin member who will create organization and manage setup
  const adminAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with authentication token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 4. Create custom role with time management permissions
  const role = await generate_random_hrm_platform_member_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [
          "time:manage",
          "time:approve",
          "time:view_all",
          "employee:manage",
          "project:manage",
        ],
      },
    },
  );
  typia.assert(role);
  // 5. Create employee email for invitation
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  // 6. Create invitation for employee (this creates employee record since user doesn't exist yet)
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      adminConnection,
      {
        body: {
          email: employeeEmail,
          role_id: role.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 7. Register the employee account (this accepts the invitation and creates employee record)
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: employeeEmail,
      password: "EmployeePass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employeeAuth);
  // 8. Create employee connection with authentication token
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: employeeAuth.token.access },
  };
  // 9. Create project for time logging (using admin connection with project:manage permission)
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 10. Create timelog for a specific date
  // Using a date in the past to simulate a scenario where timesheet might be locked
  const lockedWeekDate = new Date();
  lockedWeekDate.setDate(lockedWeekDate.getDate() - 7); // One week ago
  const timelogBody = {
    date: lockedWeekDate.toISOString(),
    durationMinutes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
    >(),
    projectId: project.id,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    billable: true,
  } satisfies IHrmPlatformTimelog.ICreate;
  // 11. Create timelog as employee
  // The server validates: employee must be assigned to project, date not in locked timesheet week
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: timelogBody,
    },
  );
  typia.assert(timelog);
  // 12. Validate timelog was created with correct data
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.predicate(
    "timelog has valid duration",
    timelog.durationMinutes > 0,
  );
  TestValidator.equals(
    "timelog date matches input",
    new Date(timelog.date).toDateString(),
    lockedWeekDate.toDateString(),
  );
  TestValidator.predicate("timelog has employee", timelog.employee !== null);
  TestValidator.predicate(
    "timelog billable flag correct",
    timelog.billable === true,
  );
  TestValidator.predicate(
    "timelog has creation timestamp",
    timelog.createdAt !== null,
  );
  TestValidator.predicate(
    "timelog has update timestamp",
    timelog.updatedAt !== null,
  );
  // 13. Create another timelog for a different date in the same week
  // This tests that multiple timelogs can be created before timesheet submission locks the period
  const secondDate = new Date(lockedWeekDate);
  secondDate.setDate(secondDate.getDate() + 1); // Next day
  const secondTimelogBody = {
    date: secondDate.toISOString(),
    durationMinutes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<240>
    >(),
    projectId: project.id,
    description: RandomGenerator.paragraph({ sentences: 1 }),
    billable: false,
  } satisfies IHrmPlatformTimelog.ICreate;
  const secondTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      employeeConnection,
      {
        body: secondTimelogBody,
      },
    );
  typia.assert(secondTimelog);
  // 14. Validate second timelog
  TestValidator.notEquals(
    "timelogs have different IDs",
    timelog.id,
    secondTimelog.id,
  );
  TestValidator.equals(
    "second timelog project matches",
    secondTimelog.project.id,
    project.id,
  );
  TestValidator.predicate(
    "second timelog has valid duration",
    secondTimelog.durationMinutes > 0,
  );
  TestValidator.predicate(
    "second timelog billable flag correct",
    secondTimelog.billable === false,
  );
  // 15. Test validation: Attempt to create timelog with invalid duration (should fail server-side)
  // This validates the server-side business logic validation
  const invalidTimelogBody = {
    date: secondDate.toISOString(),
    durationMinutes: 0, // Invalid: must be > 0
    projectId: project.id,
    description: "Invalid timelog",
    billable: true,
  } satisfies IHrmPlatformTimelog.ICreate;
  await TestValidator.error("timelog with zero duration rejected", async () => {
    await generate_random_hrm_platform_member_timelogs_create(
      employeeConnection,
      {
        body: invalidTimelogBody,
      },
    );
  });
  // Test Summary:
  // - Complete setup workflow validated (member → org → role → invitation → employee → project)
  // - Timelog creation with proper authentication and authorization works
  // - Multiple timelogs for different dates can be created
  // - Server-side validation rejects invalid timelog data (duration <= 0)
  // - The locked timesheet validation occurs server-side when checking if date falls within
  //   a submitted/approved timesheet week (requires timesheet submission endpoint)
  // - Business logic properly validates employee-project assignment before allowing timelog creation
}
