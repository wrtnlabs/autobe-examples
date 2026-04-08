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
 * Test the business rule that prevents duplicate timesheets for the same employee and week.
 *
 * Validates that the system enforces a unique constraint on (employee_id, week_start_date), ensuring only one timesheet can exist per employee per week. The test creates a valid timesheet first, then attempts to create a duplicate for the same week, expecting a 409 Conflict error.
 *
 * 1. Authenticate a member account for the employee.
 * 2. Create an organization for the employee context.
 * 3. Create an employee record linking the member to the organization.
 * 4. Create a timesheet for a specific week (Monday start date).
 * 5. Attempt to create a second timesheet for the same employee and same week.
 * 6. Validate that the second creation fails with a 409 Conflict HTTP error.
 */
export async function test_api_timesheet_duplicate_week_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: prepare_random_hrm_time_track_organization(),
      },
    );
  typia.assert(organization);
  // 3. Create employee
  const employee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: prepare_random_hrm_time_track_employee(),
      },
    );
  typia.assert(employee);
  // 4. Create first timesheet for a specific week
  const firstTimesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: prepare_random_hrm_time_track_timesheet(),
      },
    );
  typia.assert(firstTimesheet);
  // 5. Attempt to create duplicate timesheet for the same week
  await TestValidator.httpError(
    "duplicate timesheet rejected with 409 Conflict",
    409,
    async () => {
      await generate_random_hrm_time_track_member_timesheets_create(
        memberConnection,
        {
          body: {
            week_start_date: firstTimesheet.week_start_date,
          },
        },
      );
    },
  );
}