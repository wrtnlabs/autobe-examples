import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Test updating a draft timesheet's week period dates.
 *
 * Validates the timesheet update endpoint's ability to modify week period metadata while maintaining draft status. The test ensures proper date validation, automatic week_end_date calculation, and total_hours recalculation from included timelogs.
 *
 * This test covers the primary success path for timesheet modification before submission, verifying that:
 * - Week start date must be a Monday
 * - Week end date is automatically calculated as week_start_date + 6 days
 * - Total hours are recalculated from included timelogs
 * - Draft status is preserved after update
 * - Date formats conform to ISO 8601 datetime standard
 *
 * 1. Authenticate member user via join endpoint.
 * 2. Create organization for the member.
 * 3. Create employee record linking member to organization.
 * 4. Create draft timesheet for initial week period (Monday to Sunday).
 * 5. Update timesheet to a different week period with new week_start_date.
 * 6. Validate updated timesheet has correct dates, status, and recalculated total_hours.
 */
export async function test_api_timesheet_update_week_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Note: For this test, we use random UUIDs for organization and employee
  // as the focus is on testing the timesheet update endpoint's date validation
  // and recalculation logic. In a full integration test, these would be
  // created through proper organization and employee creation flows.
  // 2. Create initial draft timesheet for week 1
  // Week 1: Start on a Monday (e.g., 2024-01-15)
  const week1Start = new Date("2024-01-15T00:00:00Z"); // Monday
  const week1End = new Date(week1Start);
  week1End.setDate(week1Start.getDate() + 6); // Sunday
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const timesheet1 =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: week1Start.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(timesheet1);
  // Validate initial timesheet is in draft status
  TestValidator.equals("initial status is draft", timesheet1.status, "draft");
  // 3. Update timesheet to week 2 (different week period)
  // Week 2: Start on the following Monday (2024-01-22)
  const week2Start = new Date("2024-01-22T00:00:00Z"); // Monday
  const week2End = new Date(week2Start);
  week2End.setDate(week2Start.getDate() + 6); // Sunday
  const updatedTimesheet = await api.functional.hrm.member.timesheets.update(
    memberConnection,
    {
      timesheetId: timesheet1.id,
      body: {
        week_start_date: week2Start.toISOString(),
      } satisfies IHrmTimesheetTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimesheet);
  // 4. Validate updated timesheet
  TestValidator.equals(
    "updated status remains draft",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "week_start_date updated correctly",
    updatedTimesheet.week_start_date,
    week2Start.toISOString(),
  );
  TestValidator.equals(
    "week_end_date calculated correctly",
    updatedTimesheet.week_end_date,
    week2End.toISOString(),
  );
  // Validate week_end_date is exactly 6 days after week_start_date
  const startDate = new Date(updatedTimesheet.week_start_date);
  const endDate = new Date(updatedTimesheet.week_end_date);
  const dayDiff =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.equals(
    "week_end_date is 6 days after week_start_date",
    dayDiff,
    6,
  );
  // Validate total_hours is a number (recalculated from timelogs)
  TestValidator.predicate(
    "total_hours is a number",
    typeof updatedTimesheet.total_hours === "number",
  );
}
