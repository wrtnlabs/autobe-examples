import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeSnapshot";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployeeSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test date range filtering for employee snapshots to retrieve historical data within a specific time period.
 *
 * Validates that the employee snapshot API correctly filters snapshots based on creation date range parameters. The test authenticates as a member, queries snapshots using created_at_start and created_at_end parameters, and verifies that only snapshots created within the specified date window are returned.
 *
 * Special attention is given to ensuring the date range filter works correctly with pagination and that the response includes proper metadata about the filtered results.
 *
 * 1. Authenticate as member using authorize_member_join utility.
 * 2. Create date range boundaries for filtering snapshots.
 * 3. Query employee snapshots with date range filters.
 * 4. Validate response structure and pagination metadata.
 * 5. Verify that returned snapshots fall within the specified date range.
 */
export async function test_api_employee_snapshot_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create date range for filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  // 3. Query snapshots within date range (30 days ago to now)
  const snapshots =
    await api.functional.hrmTimeTrack.member.employee_snapshots.index(
      memberConnection,
      {
        body: {
          created_at_start: thirtyDaysAgo.toISOString(),
          created_at_end: now.toISOString(),
          limit: 20,
          page: 1,
        } satisfies IHrmTimeTrackEmployeeSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    snapshots.pagination.limit >= 1 && snapshots.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  // 5. Verify all returned snapshots are within the date range
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot created_at is after start boundary`,
      snapshotDate >= thirtyDaysAgo,
    );
    TestValidator.predicate(
      `snapshot created_at is before end boundary`,
      snapshotDate <= now,
    );
  });
  // 6. Test with different date range (60-30 days ago)
  const olderSnapshots =
    await api.functional.hrmTimeTrack.member.employee_snapshots.index(
      memberConnection,
      {
        body: {
          created_at_start: sixtyDaysAgo.toISOString(),
          created_at_end: thirtyDaysAgo.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IHrmTimeTrackEmployeeSnapshot.IRequest,
      },
    );
  typia.assert(olderSnapshots);
  // 7. Verify older snapshots are within their date range
  await ArrayUtil.asyncForEach(olderSnapshots.data, async (snapshot) => {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `older snapshot created_at is after start boundary`,
      snapshotDate >= sixtyDaysAgo,
    );
    TestValidator.predicate(
      `older snapshot created_at is before end boundary`,
      snapshotDate <= thirtyDaysAgo,
    );
  });
}
