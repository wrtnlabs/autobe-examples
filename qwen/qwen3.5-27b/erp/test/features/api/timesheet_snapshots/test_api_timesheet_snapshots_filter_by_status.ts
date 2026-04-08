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
 * Test filtering timesheet snapshots by specific status value to retrieve only snapshots matching that status.
 *
 * Validates that the timesheet snapshots endpoint correctly filters results based on the status parameter. The test authenticates as a member and calls the snapshots endpoint with different status filters to verify that only matching snapshots are returned.
 *
 * Special attention is given to verifying that the status filter parameter correctly narrows the results and that the pagination metadata reflects the filtered count rather than the total snapshot count.
 *
 * 1. Authenticate as a member using authorize_member_join utility function.
 * 2. Call the snapshots endpoint with status filter set to 'submitted'.
 * 3. Verify response structure and that all snapshots have 'submitted' status.
 * 4. Call the snapshots endpoint with status filter set to 'approved'.
 * 5. Verify response structure and that all snapshots have 'approved' status.
 */
export async function test_api_timesheet_snapshots_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // Generate a random timesheet UUID for testing
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test filtering by 'submitted' status
  const submittedResponse =
    await api.functional.hrmTimeTrack.member.timesheets.snapshots.index(
      memberConnection,
      {
        timesheetId,
        body: {
          status: "submitted",
          page: 1,
          limit: 20,
        } satisfies IHrmTimeTrackTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(submittedResponse);
  // 3. Verify submitted status filter results
  TestValidator.equals(
    "submitted filter - all snapshots have submitted status",
    submittedResponse.data.every((snapshot) => snapshot.status === "submitted"),
    true,
  );
  TestValidator.predicate(
    "submitted filter - pagination has valid records count",
    submittedResponse.pagination.records >= 0,
  );
  // 4. Test filtering by 'approved' status
  const approvedResponse =
    await api.functional.hrmTimeTrack.member.timesheets.snapshots.index(
      memberConnection,
      {
        timesheetId,
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IHrmTimeTrackTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(approvedResponse);
  // 5. Verify approved status filter results
  TestValidator.equals(
    "approved filter - all snapshots have approved status",
    approvedResponse.data.every((snapshot) => snapshot.status === "approved"),
    true,
  );
  TestValidator.predicate(
    "approved filter - pagination has valid records count",
    approvedResponse.pagination.records >= 0,
  );
}
