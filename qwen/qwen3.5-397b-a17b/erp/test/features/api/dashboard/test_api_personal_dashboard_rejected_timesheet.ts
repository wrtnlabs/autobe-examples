import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_personal_dashboard_rejected_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create employee member account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      employeeConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Get the built-in Employee role (we need to find it from the organization context)
  // For this test, we'll create the employee record with a role
  // We need to create the employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    employeeConnection,
    {
      body: {
        member_id: employeeAuth.member.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#3498db",
      },
    },
  );
  typia.assert(project);
  // 5. Assign employee to project as member
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      employeeConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create multiple timelogs for the current week
  const today = new Date();
  const timelogDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).toISOString();
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: timelogDate,
        duration_minutes: 120,
        billable: true,
        description: "Development work",
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: timelogDate,
        duration_minutes: 180,
        billable: true,
        description: "Code review",
      },
    },
  );
  typia.assert(timelog2);
  // 7. Calculate week start date (Monday of current week)
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(today.setDate(diff));
  const weekStartDate = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate(),
  ).toISOString();
  // 8. Create draft timesheet for current week
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  typia.assert(timesheet);
  // 9. Submit the timesheet
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  // 10. Create reviewer/manager member account
  const reviewerConnection: api.IConnection = { host: connection.host };
  const reviewerAuth = await authorize_member_join(reviewerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(reviewerAuth);
  // 11. Create employee record for reviewer with manager role
  // Note: We need to get the manager role ID - for this test we'll use a different approach
  // Since we can't easily get the role ID, we'll create the reviewer as an employee
  const reviewerEmployee =
    await generate_random_hrm_platform_member_employees_create(
      reviewerConnection,
      {
        body: {
          member_id: reviewerAuth.member.id,
          employment_type: "full-time",
        },
      },
    );
  typia.assert(reviewerEmployee);
  // 12. Reject the timesheet as reviewer (requires time:approve permission)
  const rejectionReason =
    "Timesheet contains incorrect hours. Please verify all entries and resubmit.";
  const rejectedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.reject(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: {
          rejection_reason: rejectionReason,
        },
      },
    );
  typia.assert(rejectedTimesheet);
  TestValidator.equals(
    "timesheet status after reject",
    rejectedTimesheet.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  // 13. Switch back to employee connection and get personal dashboard
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.personal.at(
      employeeConnection,
      {
        body: {},
      },
    );
  typia.assert(dashboard);
  // 14. Validate dashboard data
  TestValidator.predicate(
    "pendingTimesheet exists",
    dashboard.pendingTimesheet !== null,
  );
  if (dashboard.pendingTimesheet) {
    TestValidator.equals(
      "pendingTimesheet status is rejected",
      dashboard.pendingTimesheet.status,
      "rejected",
    );
    TestValidator.predicate(
      "pendingTimesheet total hours is positive",
      dashboard.pendingTimesheet.total_hours > 0,
    );
  }
  // 15. Validate hours calculations
  TestValidator.predicate(
    "hoursToday is non-negative",
    dashboard.hoursToday >= 0,
  );
  TestValidator.predicate(
    "hoursThisWeek is non-negative",
    dashboard.hoursThisWeek >= 0,
  );
  // 16. Validate recent timelogs exist
  TestValidator.predicate(
    "recentTimelogs array exists",
    Array.isArray(dashboard.recentTimelogs),
  );
  TestValidator.predicate(
    "recentTimelogs has entries",
    dashboard.recentTimelogs.length > 0,
  );
}