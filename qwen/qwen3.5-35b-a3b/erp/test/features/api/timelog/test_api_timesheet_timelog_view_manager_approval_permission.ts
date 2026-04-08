import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_timelog_view_manager_approval_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager joins system with organization
  const managerConnection: api.IConnection = { host: connection.host };
  const orgName = RandomGenerator.name();
  const orgCurrency = RandomGenerator.pick(["USD", "EUR", "KRW"]);
  const orgDescription = RandomGenerator.paragraph({ sentences: 3 });
  const orgLogoUri = typia.random<string & tags.Format<"uri">>();
  const orgTimezone = RandomGenerator.pick([
    "UTC",
    "Asia/Seoul",
    "America/New_York",
  ]);
  const orgFiscalMonth = RandomGenerator.pick([1, 4, 7, 10]);
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager@1234",
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: orgName,
      org_currency: orgCurrency,
      org_description: orgDescription,
      org_logo_uri: orgLogoUri,
      org_timezone: orgTimezone,
      org_fiscal_month: orgFiscalMonth as
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
        | undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Employee joins SAME organization as manager (same org details)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Employee@1234",
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: orgName,
      org_currency: orgCurrency,
      org_description: orgDescription,
      org_logo_uri: orgLogoUri,
      org_timezone: orgTimezone,
      org_fiscal_month: orgFiscalMonth as
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
        | undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 3. Create timesheet for employee for a specific week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        start_date: weekStart.toISOString(),
        end_date: weekEnd.toISOString(),
        hrm_platform_employee_id: employeeAuth.member.id,
        notes: "Test timesheet for approval permission validation",
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Create timelog entry within the timesheet
  const workStartDate = new Date(weekStart);
  workStartDate.setDate(workStartDate.getDate() + 1); // Tuesday
  workStartDate.setHours(9, 0, 0, 0);
  const workEndDate = new Date(workStartDate);
  workEndDate.setHours(17, 0, 0, 0);
  const durationMinutes = Math.round(
    (workEndDate.getTime() - workStartDate.getTime()) / (1000 * 60),
  );
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        employee_id: employeeAuth.member.id,
        project_id: typia.random<string & tags.Format<"uuid">>(),
        task_id: null,
        start_datetime: workStartDate.toISOString(),
        end_datetime: workEndDate.toISOString(),
        duration_minutes: durationMinutes as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 5. Manager views the employee's timelog
  const retrievedTimelog =
    await api.functional.hrmPlatform.member.timesheets.timelogs.at(
      managerConnection,
      {
        timesheetId: timesheet.id,
        timelogId: timelog.id,
      },
    );
  typia.assert(retrievedTimelog);
  // 6. Validate timelog data
  TestValidator.equals("timelog id matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "employee id matches",
    retrievedTimelog.employee.id,
    timelog.employee.id,
  );
  TestValidator.equals(
    "project id matches",
    retrievedTimelog.project.id,
    timelog.project.id,
  );
  TestValidator.equals(
    "start datetime matches",
    retrievedTimelog.start_datetime,
    timelog.start_datetime,
  );
  TestValidator.equals(
    "end datetime matches",
    retrievedTimelog.end_datetime,
    timelog.end_datetime,
  );
  TestValidator.equals(
    "duration minutes matches",
    retrievedTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "description matches",
    retrievedTimelog.description,
    timelog.description,
  );
  TestValidator.equals(
    "billable flag matches",
    retrievedTimelog.billable,
    timelog.billable,
  );
}
