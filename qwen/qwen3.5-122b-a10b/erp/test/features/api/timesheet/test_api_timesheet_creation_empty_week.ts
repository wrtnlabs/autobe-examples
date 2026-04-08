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
 * Test creating a draft timesheet for a week with no existing timelogs.
 *
 * Validates that an authenticated member can create a draft timesheet for their employee record even when no time entries have been logged for that week. The system should successfully create the timesheet in draft status with zero total hours and an empty timelogs array. This validates the draft creation flow without requiring pre-existing timelogs, though submission would be blocked per business rules requiring at least one timelog.
 *
 * 1. Register a new member with email and password credentials.
 * 2. Generate a week start date (Monday) for the timesheet period.
 * 3. Create a draft timesheet using the generation utility for an empty week.
 * 4. Validate the timesheet has status 'draft'.
 * 5. Validate total_hours is 0 since no timelogs exist.
 * 6. Validate timelogs array is empty.
 */
export async function test_api_timesheet_creation_empty_week(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a random Monday date for the week start
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate: string & tags.Format<"date-time"> =
    monday.toISOString() as string & tags.Format<"date-time">;
  // 3. Create timesheet for the week using generation utility
  // The utility handles proper organization and employee setup
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies Partial<IHrmTimesheetTimelog.ICreate>,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(timesheet);
  // 4. Validate timesheet properties for empty week
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.equals("total hours is zero", timesheet.total_hours, 0);
  TestValidator.equals("timelogs array is empty", timesheet.timelogs.length, 0);
}
