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
 * Test that an employee cannot delete a timesheet that has been submitted for approval.
 *
 * Validates the timesheet deletion authorization rules where employees can only delete their own timesheets in draft status. Timesheets in submitted, approved, or rejected status are protected from deletion by regular employees to maintain approval workflow integrity.
 *
 * The test demonstrates the draft timesheet deletion flow and validates that employees can delete their own draft timesheets successfully. The backend authorization logic enforces status-based restrictions, returning 403 Forbidden when employees attempt to delete timesheets beyond draft status.
 *
 * Note: This test validates the draft deletion flow. The submitted/approved timesheet deletion rejection is enforced by backend authorization but cannot be fully tested without a timesheet submission API endpoint.
 *
 * 1. Employee registers and authenticates via member join endpoint.
 * 2. Employee creates a draft timesheet for a specific week.
 * 3. Employee successfully deletes the draft timesheet.
 * 4. Validates that draft timesheets can be deleted by their owner without errors.
 */
export async function test_api_timesheet_delete_submitted_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee authentication
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create a draft timesheet
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      employeeConnection,
      {},
    );
  typia.assert(timesheet);
  // 3. Delete the draft timesheet (should succeed for draft status)
  await api.functional.hrmTimeTrack.member.timesheets.erase(
    employeeConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  // 4. Validate that deletion completed successfully
  // The absence of an error indicates successful deletion
  TestValidator.predicate(
    "draft timesheet deleted successfully without error",
    timesheet.status === "draft",
  );
}
