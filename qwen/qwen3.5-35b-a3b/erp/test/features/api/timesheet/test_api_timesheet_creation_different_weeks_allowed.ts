import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheet_creation_different_weeks_allowed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create member-specific connection for authenticated requests
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...connection.headers,
    Authorization: authorized.token.access,
  };
  // 3. Define week start dates (Mondays) in ISO 8601 format with timezone
  const week1Start = "2024-01-08T00:00:00+09:00";
  const week2Start = "2024-01-15T00:00:00+09:00";
  const week3Start = "2024-01-22T00:00:00+09:00";
  // 4. Create timesheet for week 1
  const timesheet1 = await api.functional.hrms.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: week1Start,
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet1);
  // 5. Create timesheet for week 2
  const timesheet2 = await api.functional.hrms.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: week2Start,
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet2);
  // 6. Create timesheet for week 3
  const timesheet3 = await api.functional.hrms.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: week3Start,
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet3);
  // 7. Validate all timesheets are created with status 'draft'
  TestValidator.equals("timesheet 1 status", timesheet1.status, "draft");
  TestValidator.equals("timesheet 2 status", timesheet2.status, "draft");
  TestValidator.equals("timesheet 3 status", timesheet3.status, "draft");
  // 8. Validate week_end_date is week_start_date + 6 days
  const parseDate = (dateStr: string) =>
    new Date(dateStr.replace("+09:00", "Z"));
  const formatAsLocalDate = (date: Date) =>
    date.toISOString().replace("T", "+09:00").split("T")[0] +
    "T" +
    date.toISOString().split("T")[1];
  const week1Date = parseDate(week1Start);
  const week1EndDate = new Date(week1Date.getTime() + 6 * 24 * 60 * 60 * 1000);
  const week1EndStr = formatAsLocalDate(week1EndDate);
  const week2Date = parseDate(week2Start);
  const week2EndDate = new Date(week2Date.getTime() + 6 * 24 * 60 * 60 * 1000);
  const week2EndStr = formatAsLocalDate(week2EndDate);
  const week3Date = parseDate(week3Start);
  const week3EndDate = new Date(week3Date.getTime() + 6 * 24 * 60 * 60 * 1000);
  const week3EndStr = formatAsLocalDate(week3EndDate);
  TestValidator.equals(
    "timesheet 1 week end date",
    timesheet1.week_end_date,
    week1EndStr,
  );
  TestValidator.equals(
    "timesheet 2 week end date",
    timesheet2.week_end_date,
    week2EndStr,
  );
  TestValidator.equals(
    "timesheet 3 week end date",
    timesheet3.week_end_date,
    week3EndStr,
  );
  // 9. Validate total_hours = 0.0 for all draft timesheets
  TestValidator.equals("timesheet 1 total hours", timesheet1.total_hours, 0.0);
  TestValidator.equals("timesheet 2 total hours", timesheet2.total_hours, 0.0);
  TestValidator.equals("timesheet 3 total hours", timesheet3.total_hours, 0.0);
  // 10. Validate all three timesheets have different IDs (unique records)
  TestValidator.notEquals(
    "timesheets have different IDs",
    timesheet1.id,
    timesheet2.id,
  );
  TestValidator.notEquals(
    "timesheets have different IDs",
    timesheet2.id,
    timesheet3.id,
  );
  TestValidator.notEquals(
    "timesheets have different IDs",
    timesheet1.id,
    timesheet3.id,
  );
  // 11. Validate employee reference is the authenticated member
  TestValidator.equals(
    "timesheet 1 employee matches authenticated user",
    timesheet1.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timesheet 2 employee matches authenticated user",
    timesheet2.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timesheet 3 employee matches authenticated user",
    timesheet3.employee.id,
    authorized.id,
  );
}
