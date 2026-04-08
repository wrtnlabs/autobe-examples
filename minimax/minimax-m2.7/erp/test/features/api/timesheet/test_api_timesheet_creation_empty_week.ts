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
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_creation_empty_week(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  // 2. Calculate a future Monday (ensure no timelogs exist in that week)
  // Today is April 2, 2026 (Thursday)
  // Next Monday is April 6, 2026
  const futureMonday = new Date("2026-04-06T00:00:00.000Z");
  const weekStartDate = futureMonday.toISOString();
  // 3. Create draft timesheet for that week (no timelogs will exist)
  const timesheet = await api.functional.erpHrm.member.timesheets.create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStartDate,
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 4. Validate business logic (NOT type validation)
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.equals("totalHours is 0", timesheet.totalHours, 0);
  TestValidator.equals(
    "timesheetTimelogs is empty",
    timesheet.timesheetTimelogs.length,
    0,
  );
  TestValidator.equals(
    "weekEndDate is Sunday",
    new Date(timesheet.weekEndDate).getDay(),
    0,
  );
  // Verify weekEndDate is correctly calculated as weekStartDate + 6 days
  const expectedWeekEndDate = new Date(futureMonday);
  expectedWeekEndDate.setUTCDate(expectedWeekEndDate.getUTCDate() + 6);
  TestValidator.equals(
    "weekEndDate equals Monday + 6 days",
    new Date(timesheet.weekEndDate).toISOString().split("T")[0],
    expectedWeekEndDate.toISOString().split("T")[0],
  );
}
