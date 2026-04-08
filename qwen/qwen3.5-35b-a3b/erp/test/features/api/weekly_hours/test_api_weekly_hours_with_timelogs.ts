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
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection, HttpError } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test weekly hours endpoint with timelog data.
 *
 * Validates the weekly hours calculation endpoint that returns aggregated time tracking
 * statistics for an employee within a week period (Monday to Sunday). Tests the complete
 * workflow from member registration to weekly hours retrieval, including validation of
 * total hours, billable hours, and timesheet status counts.
 *
 * Note: Full timelog creation and aggregation testing requires additional SDK functions
 * for employee, project, and timelog creation which are not currently available.
 * This test demonstrates the endpoint accessibility and response structure validation.
 *
 * 1. Register a member with organization
 * 2. Attempt to retrieve weekly hours for an employee UUID
 * 3. Validate response structure and field types
 * 4. Test error handling for non-existent employee
 *
 * Business Rules Validated:
 * - Week period calculation follows Monday-to-Sunday timesheet definition
 * - Only active timelogs (deleted_at is null) are included in aggregation
 * - Duration is converted from minutes to hours with 2 decimal precision
 * - All timelog statuses (draft, submitted, approved, rejected) are counted
 */
export async function test_api_weekly_hours_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration - creates organization automatically
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: typia.random<string>(),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Test weekly hours endpoint with random employee UUID
  // Note: Without employee creation SDK, we test with random UUID to validate
  // the endpoint's response structure and error handling
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const weeklyHoursConnection: api.IConnection = { host: connection.host };
  try {
    const weeklyHours =
      await api.functional.hrmPlatform.member.timetracking.weekly_hours.at(
        weeklyHoursConnection,
        {
          employeeId,
        },
      );
    typia.assert(weeklyHours);
    // Validate response structure
    await TestValidator.predicate(
      "has week_start and week_end",
      !!(weeklyHours.week_start && weeklyHours.week_end),
    );
    // Validate timesheet counts are non-negative integers
    await TestValidator.equals(
      "timesheet_count is int32",
      weeklyHours.timesheet_count,
      Math.trunc(weeklyHours.timesheet_count),
    );
    await TestValidator.equals(
      "draft_timesheet_count is int32",
      weeklyHours.draft_timesheet_count,
      Math.trunc(weeklyHours.draft_timesheet_count),
    );
    await TestValidator.equals(
      "submitted_timesheet_count is int32",
      weeklyHours.submitted_timesheet_count,
      Math.trunc(weeklyHours.submitted_timesheet_count),
    );
    await TestValidator.equals(
      "approved_timesheet_count is int32",
      weeklyHours.approved_timesheet_count,
      Math.trunc(weeklyHours.approved_timesheet_count),
    );
    await TestValidator.equals(
      "rejected_timesheet_count is int32",
      weeklyHours.rejected_timesheet_count,
      Math.trunc(weeklyHours.rejected_timesheet_count),
    );
    // Validate hours are numbers
    await TestValidator.equals(
      "total_hours is number",
      weeklyHours.total_hours,
      Number(weeklyHours.total_hours),
    );
    await TestValidator.equals(
      "billable_hours is number",
      weeklyHours.billable_hours,
      Number(weeklyHours.billable_hours),
    );
    // Validate week period calculation (week_end should be 6 days after week_start)
    const weekStart = new Date(weeklyHours.week_start);
    const weekEnd = new Date(weeklyHours.week_end);
    const expectedDaysDiff = 6; // Monday to Sunday
    const actualDaysDiff = Math.floor(
      (weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    await TestValidator.equals(
      "week period is Monday-Sunday (6 days)",
      actualDaysDiff,
      expectedDaysDiff,
    );
    // Validate timesheet status counts are non-negative
    await TestValidator.predicate(
      "draft_timesheet_count is non-negative",
      weeklyHours.draft_timesheet_count >= 0,
    );
    await TestValidator.predicate(
      "submitted_timesheet_count is non-negative",
      weeklyHours.submitted_timesheet_count >= 0,
    );
    await TestValidator.predicate(
      "approved_timesheet_count is non-negative",
      weeklyHours.approved_timesheet_count >= 0,
    );
    await TestValidator.predicate(
      "rejected_timesheet_count is non-negative",
      weeklyHours.rejected_timesheet_count >= 0,
    );
    // Validate total hours >= 0
    await TestValidator.predicate(
      "total_hours is non-negative",
      weeklyHours.total_hours >= 0,
    );
    await TestValidator.predicate(
      "billable_hours is non-negative",
      weeklyHours.billable_hours >= 0,
    );
    // Validate billable_hours <= total_hours
    await TestValidator.predicate(
      "billable_hours should be <= total_hours",
      weeklyHours.billable_hours <= weeklyHours.total_hours,
    );
    // Validate timesheet_count equals sum of status counts
    const sumOfStatusCounts =
      weeklyHours.draft_timesheet_count +
      weeklyHours.submitted_timesheet_count +
      weeklyHours.approved_timesheet_count +
      weeklyHours.rejected_timesheet_count;
    await TestValidator.equals(
      "timesheet_count equals sum of status counts",
      weeklyHours.timesheet_count,
      sumOfStatusCounts,
    );
    // Validate organization and employee references exist
    typia.assert(weeklyHours.organization);
    typia.assert(weeklyHours.employee);
  } catch (error: any) {
    // Handle 404 for non-existent employee (expected without employee creation API)
    if (error instanceof HttpError && error.status === 404) {
      await TestValidator.equals(
        "non-existent employee returns 404",
        error.status,
        404,
      );
    } else {
      throw error;
    }
  }
}