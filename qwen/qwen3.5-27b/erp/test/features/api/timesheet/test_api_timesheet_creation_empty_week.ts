import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_timesheets_create } from "../../../generate/generate_random_hrm_time_track_member_timesheets_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_timesheet } from "../../../prepare/prepare_random_hrm_time_track_timesheet";

/**
 * Test creating a timesheet for a week where the employee has no timelogs logged.
 *
 * Validates the complete timesheet creation flow including member authentication, organization setup, employee record creation, and timesheet generation for an empty week. Ensures that the system allows timesheet creation even when no time has been logged for that week, which is a valid business scenario such as vacation week or new employee's first week.
 *
 * Special attention is given to verifying that the timesheet is created in draft status with an empty timelogs array, and that the week dates are correctly calculated with week_start_date on Monday and week_end_date on Sunday.
 *
 * 1. Member authenticates via join endpoint to obtain authorization tokens.
 * 2. Organization is created to provide context for the employee.
 * 3. Employee record is created linking the authenticated member to the organization.
 * 4. Timesheet is created for a week with no timelogs logged.
 * 5. Validates timesheet has draft status, empty timelogs array, and correct week dates.
 */
export async function test_api_timesheet_creation_empty_week(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee record - organization is handled implicitly by the generate function
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Create timesheet for a week with no timelogs - employee is handled implicitly
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {},
    );
  typia.assert(timesheet);
  // 5. Validate timesheet is in draft status
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 6. Validate timelogs array is empty
  TestValidator.equals("timelogs array is empty", timesheet.timelogs.length, 0);
  // 7. Validate week_start_date is Monday (getDay() returns 1 for Monday)
  TestValidator.predicate(
    "week_start_date is Monday",
    new Date(timesheet.week_start_date).getDay() === 1,
  );
  // 8. Validate week_end_date is Sunday (getDay() returns 0 for Sunday)
  TestValidator.predicate(
    "week_end_date is Sunday",
    new Date(timesheet.week_end_date).getDay() === 0,
  );
  // 9. Validate week_end_date is 6 days after week_start_date
  const startDate = new Date(timesheet.week_start_date).getTime();
  const endDate = new Date(timesheet.week_end_date).getTime();
  const diffInDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
  TestValidator.equals(
    "week_end_date is 6 days after week_start_date",
    diffInDays,
    6,
  );
}
