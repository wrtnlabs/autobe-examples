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
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelogs_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create timelog for the authenticated employee
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {},
  );
  typia.assert(timelog);
  // 3. Create a draft timesheet for the week that includes the timelog date
  const weekStartDate = new Date(timelog.date);
  // Ensure we start on Monday
  const dayOfWeek = weekStartDate.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - daysToMonday);
  weekStartDate.setUTCHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStartDate.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Retrieve timelogs from the timesheet using invert endpoint
  const result = await api.functional.erpHrm.member.timesheets.timelogs.invert(
    memberConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(result);
  // 5. Verify the returned timelog matches our created timelog
  TestValidator.equals("timelog id matches", result.id, timelog.id);
  TestValidator.equals(
    "employee id matches",
    result.employee.id,
    timelog.employee.id,
  );
  TestValidator.equals(
    "project id matches",
    result.project.id,
    timelog.project.id,
  );
  TestValidator.equals("date matches", result.date, timelog.date);
  TestValidator.equals(
    "durationMinutes matches",
    result.durationMinutes,
    timelog.durationMinutes,
  );
  TestValidator.equals("billable matches", result.billable, timelog.billable);
  // 6. Verify timesheet context is included in the response
  TestValidator.predicate("timesheet context exists", !!result.timesheet);
  TestValidator.equals(
    "timesheet id in context matches",
    result.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "timesheet status is draft",
    result.timesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet employee matches",
    result.timesheet.employee.id,
    timesheet.employee.id,
  );
}
