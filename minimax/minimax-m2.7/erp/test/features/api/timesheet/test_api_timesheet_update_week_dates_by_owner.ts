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

export async function test_api_timesheet_update_week_dates_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a draft timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {},
  );
  typia.assert(timesheet);
  // Store original values for comparison
  const originalWeekStartDate = timesheet.week_start_date;
  const originalWeekEndDate = timesheet.week_end_date;
  // 3. Generate new Monday-Sunday dates for the update
  // Get a date that is a Monday and calculate the new week range
  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay();
  const daysToMonday =
    dayOfWeek === 0 ? 1 : dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  // Calculate new Monday (week start)
  const newMonday = new Date(currentDate);
  newMonday.setDate(currentDate.getDate() + daysToMonday - 7);
  const newWeekStartDate = newMonday.toISOString();
  // Calculate new Sunday (week end - 6 days after Monday)
  const newSunday = new Date(newMonday);
  newSunday.setDate(newMonday.getDate() + 6);
  const newWeekEndDate = newSunday.toISOString();
  // 4. Update the timesheet with new week dates
  const updatedTimesheet = await api.functional.erpHrm.member.timesheets.update(
    memberConnection,
    {
      timesheetId: timesheet.id,
      body: {
        weekStartDate: newWeekStartDate satisfies string &
          tags.Format<"date-time">,
        weekEndDate: newWeekEndDate satisfies string & tags.Format<"date-time">,
      } satisfies IErpHrmTimesheet.IUpdate,
    },
  );
  typia.assert(updatedTimesheet);
  // 5. Validate the update response
  TestValidator.equals(
    "timesheet ID preserved",
    updatedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "employee preserved",
    updatedTimesheet.employee.id,
    timesheet.employee.id,
  );
  TestValidator.equals(
    "status remains draft",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.notEquals(
    "week start date updated",
    updatedTimesheet.week_start_date,
    originalWeekStartDate,
  );
  TestValidator.equals(
    "new week start date applied",
    updatedTimesheet.week_start_date,
    newWeekStartDate,
  );
  TestValidator.notEquals(
    "week end date updated",
    updatedTimesheet.week_end_date,
    originalWeekEndDate,
  );
  TestValidator.equals(
    "new week end date applied",
    updatedTimesheet.week_end_date,
    newWeekEndDate,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedTimesheet.updated_at !== null,
  );
}
