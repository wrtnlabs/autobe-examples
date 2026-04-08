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
import type { IHrmTimeTrackTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheetSnapshot";
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
 * Test retrieving a timesheet snapshot that captures a rejection event in the timesheet approval workflow.
 *
 * Validates the timesheet snapshot retrieval functionality by creating a member account, generating a timesheet, and retrieving a specific snapshot record. The test ensures that snapshot data is properly structured with timesheet references, member information, status tracking, and audit timestamps.
 *
 * Due to limited API endpoints available for timesheet approval workflow (submit/reject operations), this test focuses on verifying the snapshot retrieval endpoint returns properly structured IHrmTimeTrackTimesheetSnapshot data with all required fields including timesheet summary, member summary, status, and creation timestamp.
 *
 * 1. Authenticate as a member by joining the system
 * 2. Create a timesheet for a specific week period
 * 3. Generate random UUIDs for timesheet and snapshot IDs to test retrieval
 * 4. Call the snapshot retrieval endpoint with the generated IDs
 * 5. Validate the response structure contains all required snapshot fields
 * 6. Verify the snapshot includes timesheet and member summary information
 */
export async function test_api_timesheet_snapshot_retrieve_rejection_event(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a timesheet for a specific week
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {},
    );
  typia.assert(timesheet);
  // 3. Generate a snapshot ID for retrieval testing
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the timesheet snapshot
  const snapshot: IHrmTimeTrackTimesheetSnapshot =
    await api.functional.hrmTimeTrack.member.timesheets.snapshots.at(
      memberConnection,
      {
        timesheetId: timesheet.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate business logic - snapshot references correct timesheet
  TestValidator.equals(
    "snapshot references created timesheet",
    snapshot.timesheet.id,
    timesheet.id,
  );
  // 6. Validate snapshot contains member who performed the action
  TestValidator.equals(
    "snapshot has member reference",
    snapshot.member.id !== undefined,
    true,
  );
  // 7. Validate snapshot status is set
  TestValidator.equals(
    "snapshot has status value",
    snapshot.status !== undefined,
    true,
  );
  // 8. Validate snapshot creation timestamp exists
  TestValidator.equals(
    "snapshot has creation timestamp",
    snapshot.created_at !== undefined,
    true,
  );
}
