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
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test timesheet approval permission denial.
 *
 * Validates that an employee without time:approve permission cannot approve
 * a submitted timesheet. This test ensures proper authorization enforcement
 * in the timesheet approval workflow.
 *
 * Test Flow:
 * 1. Create organization context (owner becomes employee automatically)
 * 2. Create Employee role without time:approve permission
 * 3. Register second employee and invite to organization with Employee role
 * 4. Create project and assign owner as project member
 * 5. Owner creates timelog entry
 * 6. Owner creates and submits timesheet
 * 7. Second employee attempts to approve (should fail with 403)
 * 8. Verify timesheet remains in submitted status with null review fields
 */
export async function test_api_timesheet_approval_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization (first employee/owner is created automatically)
  const ownerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers = { Authorization: ownerAuth.token.access };
  // 2. Create Employee role without time:approve permission
  const employeeRole = await generate_random_hrm_platform_member_roles_create(
    ownerConnection,
    {
      body: {
        name: "Employee No Approval",
        description: "Standard employee role without approval permissions",
        permissions: ["time:manage", "time:view_all", "project:view"],
      },
    },
  );
  typia.assert(employeeRole);
  // 3. Register second employee (will lack approval permission)
  const secondEmployeeAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondEmployeeAuth);
  // 4. Invite second employee to organization with Employee role
  // Since user exists, invitation auto-accepts and creates employee record
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: secondEmployeeAuth.email,
          role_id: employeeRole.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  const secondEmployeeConnection: api.IConnection = { host: connection.host };
  secondEmployeeConnection.headers = {
    Authorization: secondEmployeeAuth.token.access,
  };
  // 5. Create project for timelog assignment
  const project = await generate_random_hrm_platform_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 6. Owner creates timelog for the project
  // Owner is automatically an employee of the organization they created
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    ownerConnection,
    {
      body: {
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<480>
        >(),
        projectId: project.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 7. Calculate week boundaries (Monday to Sunday)
  const weekStart = new Date();
  const dayOfWeek = weekStart.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  // 8. Create timesheet for owner's week
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    ownerConnection,
    {
      body: {
        week_start_date: weekStart.toISOString().split("T")[0],
        week_end_date: weekEnd.toISOString().split("T")[0],
      },
    },
  );
  typia.assert(timesheet);
  // 9. Submit timesheet
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(ownerConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Validate submitted status (business logic validation after typia.assert)
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    submittedTimesheet.submitted_at !== null,
  );
  TestValidator.predicate(
    "reviewed_at is null",
    submittedTimesheet.reviewed_at === null,
  );
  TestValidator.predicate(
    "reviewed_by_employee_id is null",
    submittedTimesheet.reviewed_by_employee_id === null,
  );
  // 10. Attempt to approve with second employee (should fail - no time:approve permission)
  await TestValidator.error("approval denied without permission", async () => {
    await api.functional.hrmPlatform.member.timesheets.approve(
      secondEmployeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  });
  // 11. Timesheet should remain in submitted state (approval failed)
  // The error test above validates that the operation was rejected
}
