import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_approval_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager account and get manager connection
  const managerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuth);
  const managerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${managerAuth.token.access}`,
    },
  };
  // 2. Create employee account (timesheet owner)
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Employee123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${employeeAuth.token.access}`,
    },
  };
  // 3. Create employee record for the employee user
  const employeeRecord =
    await generate_random_hrm_platform_member_employees_create(
      managerConnection,
      {
        body: {
          member_id: employeeAuth.member.id,
          employment_type: "full-time",
        },
      },
    );
  typia.assert(employeeRecord);
  // 4. Create timelogs for the employee for a specific week
  const testWeekStart = new Date();
  testWeekStart.setDate(testWeekStart.getDate() - testWeekStart.getDay() + 1); // Monday
  testWeekStart.setHours(0, 0, 0, 0);
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        date: testWeekStart.toISOString(),
        duration_minutes: 480, // 8 hours
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        date: new Date(
          testWeekStart.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(), // Tuesday
        duration_minutes: 360, // 6 hours
      },
    },
  );
  typia.assert(timelog2);
  // 5. Create draft timesheet for the week
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: testWeekStart.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 6. Submit timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      employeeConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    submittedTimesheet.submitted_at !== null,
  );
  // 7. Manager approves the timesheet
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.approve(
      managerConnection,
      {
        timesheetId: submittedTimesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  // 8. Validate approval results
  TestValidator.equals(
    "timesheet status is approved",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is set",
    approvedTimesheet.reviewed_at !== null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    approvedTimesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "reviewedBy is manager",
    approvedTimesheet.reviewedBy?.id,
    managerAuth.member.id,
  );
  TestValidator.predicate(
    "timelogs are included",
    approvedTimesheet.timelogs.length > 0,
  );
}
