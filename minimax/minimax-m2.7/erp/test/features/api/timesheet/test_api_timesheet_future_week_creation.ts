import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test creating a timesheet for a future week with no timelogs.
 *
 * This test validates that:
 * 1. Member can authenticate and create a draft timesheet for a future week
 * 2. Timesheet is created successfully with status 'draft'
 * 3. Total hours is 0 since no timelogs exist in the future
 * 4. TimesheetTimelogs array is empty
 * 5. Week dates are correctly set to future Monday-Sunday range
 */
export async function test_api_timesheet_future_week_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to get session with employee context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Calculate next week's Monday and Sunday for future week range
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);
  // 3. Create draft timesheet for future week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: nextMonday.toISOString(),
        week_end_date: nextSunday.toISOString(),
      },
    },
  );
  // 4. Validate response with typia.assert
  typia.assert(timesheet);
  // 5. Validate timesheet properties
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.equals("total_hours is 0", timesheet.total_hours, 0);
  TestValidator.equals(
    "timesheetTimelogs is empty",
    timesheet.timesheetTimelogs.length,
    0,
  );
  // Validate week dates are correctly set
  const responseStartDate = new Date(timesheet.week_start_date);
  const responseEndDate = new Date(timesheet.week_end_date);
  TestValidator.equals(
    "week_start_date matches Monday",
    responseStartDate.getDay(),
    1,
  );
  TestValidator.equals(
    "week_end_date matches Sunday",
    responseEndDate.getDay(),
    0,
  );
  // Validate week spans 7 days (Monday to Sunday)
  const dayDiff =
    (responseEndDate.getTime() - responseStartDate.getTime()) /
    (1000 * 60 * 60 * 24);
  TestValidator.equals("week spans 6 days between start and end", dayDiff, 6);
  // Validate dates are in the future
  TestValidator.predicate(
    "week_start_date is in future",
    responseStartDate > today,
  );
  TestValidator.predicate(
    "week_end_date is in future",
    responseEndDate > today,
  );
}
