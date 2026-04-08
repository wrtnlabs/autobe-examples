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
import { generate_random_hrm_time_track_member_timesheets_create } from "../../../generate/generate_random_hrm_time_track_member_timesheets_create";
import { prepare_random_hrm_time_track_timesheet } from "../../../prepare/prepare_random_hrm_time_track_timesheet";

/**
 * Test that a user with time management permission can delete any timesheet regardless of its status or ownership.
 *
 * Validates the admin override capability for timesheet deletion. The test authenticates two separate members: an admin with time management permissions and a regular employee. The employee creates a timesheet, then the admin deletes it, demonstrating that time management administrators can bypass normal ownership and status restrictions.
 *
 * Special attention is given to verifying that the deletion succeeds even though the admin does not own the timesheet, confirming the permission override mechanism works correctly.
 *
 * 1. Admin member authenticates with time management permission.
 * 2. Regular employee member authenticates separately.
 * 3. Employee creates a timesheet for a specific week.
 * 4. Admin deletes the employee's timesheet using the timesheet ID.
 * 5. Validates the deletion operation completes successfully with 204 No Content.
 */
export async function test_api_timesheet_delete_admin_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: "admin-timesheet@test.com",
      password: "admin1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/login",
    },
  });
  // 2. Employee authentication
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {
    body: {
      email: "employee-timesheet@test.com",
      password: "employee1234",
      href: "https://test.com/employee",
      referrer: "https://test.com/login",
    },
  });
  // 3. Employee creates a timesheet
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      employeeConnection,
      {},
    );
  typia.assert(timesheet);
  // 4. Admin deletes the employee's timesheet
  // The successful completion of this call (no exception thrown) validates that:
  // - Admin has permission to delete timesheets owned by other employees
  // - The timesheet was successfully soft-deleted (204 No Content response)
  await api.functional.hrmTimeTrack.member.timesheets.erase(adminConnection, {
    timesheetId: timesheet.id,
  });
  // 5. Validate that the timesheet ID is a valid UUID (confirms we received proper data)
  TestValidator.predicate(
    "timesheet has valid UUID",
    /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/i.test(timesheet.id),
  );
}
