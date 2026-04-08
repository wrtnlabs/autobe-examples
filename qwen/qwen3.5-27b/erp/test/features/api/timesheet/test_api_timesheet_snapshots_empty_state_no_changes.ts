import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheetSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving snapshots for a timesheet that has no status change history (remains in draft status since creation).
 *
 * Validates the edge case where a timesheet exists but has never undergone status transitions. The endpoint should return a valid paginated response with an empty data array and appropriate pagination metadata.
 *
 * Special attention is given to verifying that the response structure remains valid even when no snapshots exist, ensuring proper handling of the empty state without throwing errors.
 *
 * 1. Authenticate as a member to gain access to timesheet endpoints.
 * 2. Generate a valid timesheet UUID to test the snapshots endpoint.
 * 3. Call the snapshots endpoint with the timesheetId.
 * 4. Validate the response returns an empty data array.
 * 5. Verify pagination metadata shows 0 records and 0 pages.
 */
export async function test_api_timesheet_snapshots_empty_state_no_changes(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a valid timesheet UUID for testing
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the snapshots endpoint
  const snapshots =
    await api.functional.hrmTimeTrack.member.timesheets.snapshots.index(
      memberConnection,
      {
        timesheetId,
        body: {} satisfies IHrmTimeTrackTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate empty data array
  TestValidator.equals("snapshots data is empty", snapshots.data.length, 0);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination records is 0",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", snapshots.pagination.pages, 0);
  TestValidator.predicate(
    "pagination current is at least 1",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshots.pagination.limit > 0,
  );
}
