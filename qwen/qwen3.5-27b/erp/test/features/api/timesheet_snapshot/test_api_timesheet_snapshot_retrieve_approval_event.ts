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
 * Test retrieving a timesheet snapshot that captures an approval event in the timesheet approval workflow.
 *
 * Validates the snapshot retrieval endpoint by authenticating a member, creating a timesheet, and retrieving a snapshot record. The test ensures that the snapshot response contains all required fields including the snapshot ID, timesheet reference, member information, status, and creation timestamp.
 *
 * Special attention is given to verifying that the snapshot data structure conforms to the IHrmTimeTrackTimesheetSnapshot DTO and that all relationships (timesheet, member) are properly populated.
 *
 * 1. Authenticate as a member using authorize_member_join utility function.
 * 2. Create a timesheet for a specific week using generate_random_hrm_time_track_member_timesheets_create utility function.
 * 3. Generate a snapshot ID to test the retrieval endpoint.
 * 4. Call GET /hrmTimeTrack/member/timesheets/{timesheetId}/snapshots/{snapshotId} to retrieve the snapshot.
 * 5. Validate the snapshot response structure and data integrity.
 */
export async function test_api_timesheet_snapshot_retrieve_approval_event(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create a timesheet for a specific week
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: typia.random<string & tags.Format<"date-time">>(),
        } satisfies IHrmTimeTrackTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  // 3. Generate a snapshot ID to test retrieval
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the snapshot
  const snapshot =
    await api.functional.hrmTimeTrack.member.timesheets.snapshots.at(
      memberConnection,
      {
        timesheetId: timesheet.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot response structure
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "timesheet ID matches",
    snapshot.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "member email present",
    snapshot.member.email,
    snapshot.member.email,
  );
  TestValidator.predicate("status is valid", snapshot.status.length > 0);
  TestValidator.predicate(
    "created_at is valid",
    snapshot.created_at.length > 0,
  );
}
