import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
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
 * Test that an employee can successfully update the week range of their own draft timesheet.
 *
 * Validates the complete flow where an employee creates a draft timesheet for an initial Monday-to-Sunday week, then updates it to a different future week. The response must reflect the new week_start_date and week_end_date, preserve the draft status, retain all existing timelogs, and show a refreshed updated_at timestamp.
 *
 * 1. Employee authenticates via member join to obtain session credentials.
 * 2. Employee creates a draft timesheet for the next upcoming Monday week.
 * 3. Employee updates the timesheet's week range to a Monday two weeks later.
 * 4. Validates timesheet identity is unchanged, status remains draft, week dates are updated to the new range, and updated_at is refreshed.
 */
export async function test_api_timesheet_week_range_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Compute two distinct Monday dates for the week ranges (in UTC)
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysToMondayUTC = utcDay === 1 ? 7 : (8 - utcDay) % 7;
  const monday1 = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysToMondayUTC,
    ),
  );
  const monday2 = new Date(monday1.getTime());
  monday2.setUTCDate(monday1.getUTCDate() + 14);
  // 3. Create a draft timesheet for the initial week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday1.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 4. Update the timesheet's week range to a different future week
  const updated = await api.functional.erpHrm.member.timesheets.update(
    memberConnection,
    {
      timesheetId: timesheet.id,
      body: {
        week_start_date: monday2.toISOString(),
      } satisfies IErpHrmTimesheet.IUpdate,
    },
  );
  typia.assert(updated);
  // 5. Validate the updated timesheet
  TestValidator.equals("timesheet id unchanged", updated.id, timesheet.id);
  TestValidator.equals("status remains draft", updated.status, "draft");
  TestValidator.notEquals(
    "week_start_date updated",
    updated.week_start_date,
    timesheet.week_start_date,
  );
  TestValidator.notEquals(
    "week_end_date updated",
    updated.week_end_date,
    timesheet.week_end_date,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updated.updated_at,
    timesheet.updated_at,
  );
  TestValidator.predicate(
    "week_start_date reflects new Monday date",
    updated.week_start_date.startsWith(monday2.toISOString().substring(0, 10)),
  );
  TestValidator.predicate(
    "week_end_date is exactly 6 days after week_start_date",
    () => {
      const start = new Date(updated.week_start_date);
      const end = new Date(updated.week_end_date);
      const diffDays = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      return diffDays === 6;
    },
  );
}
