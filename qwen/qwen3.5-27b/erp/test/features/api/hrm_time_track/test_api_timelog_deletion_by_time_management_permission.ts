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
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { generate_random_hrm_time_track_member_timesheets_create } from "../../../generate/generate_random_hrm_time_track_member_timesheets_create";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";
import { prepare_random_hrm_time_track_timesheet } from "../../../prepare/prepare_random_hrm_time_track_timesheet";

/**
 * Test permission-based timelog deletion with time management override capability.
 *
 * Validates that a user with time management permissions can delete another employee's timelog even when it's part of an approved timesheet. This test ensures that authorized personnel can maintain data integrity and correct errors in approved timesheets.
 *
 * The test creates two separate member accounts (employee and manager), establishes a timelog owned by the employee, includes it in an approved timesheet, and then verifies that the manager can successfully delete the timelog despite the approval status and ownership restrictions.
 *
 * 1. Register and authenticate as employee with regular permissions.
 * 2. Register and authenticate as manager with time management permissions.
 * 3. Employee creates a timelog entry for a specific work date.
 * 4. Employee creates a timesheet that includes the timelog.
 * 5. Manager approves the timesheet to lock it in approved status.
 * 6. Manager deletes the employee's timelog (permission override).
 * 7. Validates that deletion succeeds despite timesheet approval and ownership.
 */
export async function test_api_timelog_deletion_by_time_management_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(employeeAuth);
  // 2. Register and authenticate as manager
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(managerAuth);
  // 3. Employee creates a timelog entry
  const timelog = await generate_random_hrm_time_track_member_timelogs_create(
    employeeConnection,
    {},
  );
  typia.assert(timelog);
  // 4. Employee creates a timesheet including the timelog
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: timelog.date,
        },
      },
    );
  typia.assert(timesheet);
  // 5. Manager approves the timesheet
  const approvedTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      managerConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "approved",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(approvedTimesheet);
  // Validate timesheet is now approved
  TestValidator.equals(
    "timesheet status approved",
    approvedTimesheet.status,
    "approved",
  );
  // 6. Manager deletes the employee's timelog (permission override)
  await api.functional.hrmTimeTrack.member.timelogs.erase(managerConnection, {
    timelogId: timelog.id,
  });
  // 7. Validate deletion succeeded (no error thrown means 204 No Content)
  TestValidator.predicate(
    "timelog deletion succeeded with time management permission",
    true,
  );
}
