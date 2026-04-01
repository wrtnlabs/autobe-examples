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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
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

export async function test_api_timelog_list_approved_timesheet_locked_entries(
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
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 2. Create manager member account (with time:approve permission)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // 3. Create multiple timelog entries for the employee
  // The prepare function handles project assignment internally
  const timelogCount = 3;
  const createdTimelogs: IHrmPlatformTimelog[] = [];
  for (let i = 0; i < timelogCount; i++) {
    const timelog = await generate_random_hrm_platform_member_timelogs_create(
      employeeConnection,
      {
        body: {
          durationMinutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: i % 2 === 0, // Alternate billable status
        },
      },
    );
    typia.assert(timelog);
    createdTimelogs.push(timelog);
  }
  // 4. Extract the week from the first timelog to create timesheet
  const firstTimelogDate = new Date(createdTimelogs[0].date);
  // Calculate Monday of that week
  const dayOfWeek = firstTimelogDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(firstTimelogDate);
  monday.setDate(firstTimelogDate.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const weekStartDate = monday.toISOString().split("T")[0]; // YYYY-MM-DD
  const weekEndDate = sunday.toISOString().split("T")[0]; // YYYY-MM-DD
  // 5. Create draft timesheet for the week
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // Verify timesheet is in draft status and includes all timelogs
  TestValidator.equals("timesheet initial status", timesheet.status, "draft");
  TestValidator.equals(
    "timesheet includes all timelogs",
    timesheet.timelogs.length,
    timelogCount,
  );
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
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  // 7. Approve timesheet as manager
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.approve(
      managerConnection,
      {
        timesheetId: submittedTimesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "timesheet status after approval",
    approvedTimesheet.status,
    "approved",
  );
  // 8. Query timelogs list - verify timelogs are still visible after approval
  const timelogList = await api.functional.hrmPlatform.member.timelogs.index(
    employeeConnection,
    {
      body: {
        fromDate: monday.toISOString(),
        toDate: sunday.toISOString(),
      } satisfies IHrmPlatformTimelog.IRequest,
    },
  );
  typia.assert(timelogList);
  // Verify pagination structure
  TestValidator.predicate("has pagination", timelogList.pagination !== null);
  TestValidator.predicate("has data array", Array.isArray(timelogList.data));
  TestValidator.equals(
    "correct number of timelogs",
    timelogList.data.length,
    timelogCount,
  );
  // 9. Verify all timelogs have required fields and are from approved timesheet
  for (const timelogSummary of timelogList.data) {
    typia.assert(timelogSummary);
    // Verify employee is present
    TestValidator.predicate(
      "timelog has employee",
      timelogSummary.employee !== null,
    );
    // Verify project is present
    TestValidator.predicate(
      "timelog has project",
      timelogSummary.project !== null,
    );
  }
  // 10. Test filtering on locked timelogs - filter by billable status
  const billableTimelogs =
    await api.functional.hrmPlatform.member.timelogs.index(employeeConnection, {
      body: {
        fromDate: monday.toISOString(),
        toDate: sunday.toISOString(),
        billable: true,
      } satisfies IHrmPlatformTimelog.IRequest,
    });
  typia.assert(billableTimelogs);
  TestValidator.predicate(
    "billable filter returns subset",
    billableTimelogs.data.length <= timelogCount,
  );
  // 11. Verify all returned timelogs are from the approved timesheet week
  for (const timelog of timelogList.data) {
    TestValidator.predicate(
      "timelog date within week range",
      new Date(timelog.date) >= monday && new Date(timelog.date) <= sunday,
    );
  }
  // 12. Verify timelogs from approved timesheet remain accessible
  // The key validation: approved timesheet timelogs are visible and queryable
  TestValidator.predicate(
    "approved timesheet timelogs remain visible",
    timelogList.data.length > 0,
  );
  // 13. Verify timesheet approval workflow completed successfully
  TestValidator.notEquals(
    "timesheet was approved (not draft)",
    approvedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet reached approved status",
    approvedTimesheet.status,
    "approved",
  );
}
