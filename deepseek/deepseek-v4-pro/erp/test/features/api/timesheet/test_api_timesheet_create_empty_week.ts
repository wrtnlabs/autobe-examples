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
 * Test creation of a draft timesheet for a calendar week with no ungrouped timelogs.
 *
 * Validates that an authenticated employee can create a timesheet for any Monday-to-Sunday calendar week, even when no timelogs exist for that week. The timesheet is created in draft status with an empty timelogs array, ready for the employee to add time entries before submission.
 *
 * This scenario confirms the system's correct behavior for empty weeks — the employee can proactively create a timesheet structure and populate it with timelogs later, rather than being blocked by the absence of pre-existing time entries.
 *
 * 1. A new member registers and authenticates via authorize_member_join.
 * 2. A valid Monday date is computed as the week_start_date.
 * 3. A draft timesheet is created for that week — since no timelogs exist, the timelogs array is empty.
 * 4. Validates draft status, null review metadata, correct employee reference, and proper week boundaries (6-day span from Monday to Sunday).
 */
export async function test_api_timesheet_create_empty_week(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Compute a valid Monday date for week_start_date
  const now = new Date();
  const currentDay = now.getDay();
  const daysToLastMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToLastMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString();
  // 3. Create timesheet for the empty week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  typia.assert(timesheet);
  // 4. Validate draft status and null review metadata
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.equals("timelogs is empty", timesheet.timelogs.length, 0);
  TestValidator.equals("submitted_at is null", timesheet.submitted_at, null);
  TestValidator.equals("reviewed_at is null", timesheet.reviewed_at, null);
  TestValidator.equals(
    "reviewedByUser is null",
    timesheet.reviewedByUser,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    timesheet.rejection_reason,
    null,
  );
  // 5. Validate employee identity matches authenticated member
  TestValidator.equals(
    "employee id matches member",
    timesheet.employee.member.id,
    member.id,
  );
  // 6. Validate week boundaries span exactly 6 days (Monday to Sunday)
  const responseStart = new Date(timesheet.week_start_date);
  const responseEnd = new Date(timesheet.week_end_date);
  const diffDays = Math.round(
    (responseEnd.getTime() - responseStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  TestValidator.equals("week span is 6 days", diffDays, 6);
}
