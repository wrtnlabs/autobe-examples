import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timesheet list behavior with empty results and pagination edge cases.
 *
 * Validates the timesheet list endpoint behavior when no timesheets exist for the authenticated member. Tests various pagination scenarios including empty result sets, out-of-bounds page requests, and different status filters to ensure the API handles edge cases gracefully.
 *
 * Special attention is given to verifying that pagination metadata correctly reflects empty datasets (records = 0, pages = 0) and that the API does not throw errors when requesting pages beyond available data.
 *
 * 1. Register and authenticate a new member account.
 * 2. Test empty result set with status filter 'approved'.
 * 3. Verify pagination shows records = 0 and pages = 0.
 * 4. Test out-of-bounds page request (page = 100).
 * 5. Verify graceful handling with empty results.
 * 6. Test different status filters ('draft', 'submitted', 'rejected').
 * 7. Verify all status filters return empty results correctly.
 */
export async function test_api_timesheet_empty_results_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Empty result set with status filter 'approved'
  const emptyApproved =
    await api.functional.hrmTimeTrack.member.timesheets.index(
      memberConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackTimesheet.IRequest,
      },
    );
  typia.assert(emptyApproved);
  // Verify empty results
  TestValidator.equals(
    "approved status returns empty data array",
    emptyApproved.data.length,
    0,
  );
  TestValidator.equals(
    "approved status pagination records is 0",
    emptyApproved.pagination.records,
    0,
  );
  TestValidator.equals(
    "approved status pagination pages is 0",
    emptyApproved.pagination.pages,
    0,
  );
  TestValidator.equals(
    "approved status pagination current is 1",
    emptyApproved.pagination.current,
    1,
  );
  TestValidator.equals(
    "approved status pagination limit is 10",
    emptyApproved.pagination.limit,
    10,
  );
  // 3. Test out-of-bounds page request (page = 100)
  const outOfBounds = await api.functional.hrmTimeTrack.member.timesheets.index(
    memberConnection,
    {
      body: {
        page: 100,
        limit: 10,
      } satisfies IHrmTimeTrackTimesheet.IRequest,
    },
  );
  typia.assert(outOfBounds);
  // Verify graceful handling of out-of-bounds page
  TestValidator.equals(
    "out of bounds page returns empty data array",
    outOfBounds.data.length,
    0,
  );
  TestValidator.equals(
    "out of bounds page pagination records is 0",
    outOfBounds.pagination.records,
    0,
  );
  TestValidator.equals(
    "out of bounds page pagination pages is 0",
    outOfBounds.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "out of bounds page current reflects requested page",
    outOfBounds.pagination.current >= 1,
  );
  // 4. Test different status filters - 'draft'
  const emptyDraft = await api.functional.hrmTimeTrack.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "draft",
        page: 1,
        limit: 20,
      } satisfies IHrmTimeTrackTimesheet.IRequest,
    },
  );
  typia.assert(emptyDraft);
  TestValidator.equals(
    "draft status returns empty data array",
    emptyDraft.data.length,
    0,
  );
  TestValidator.equals(
    "draft status pagination records is 0",
    emptyDraft.pagination.records,
    0,
  );
  TestValidator.equals(
    "draft status pagination limit is 20",
    emptyDraft.pagination.limit,
    20,
  );
  // 5. Test different status filters - 'submitted'
  const emptySubmitted =
    await api.functional.hrmTimeTrack.member.timesheets.index(
      memberConnection,
      {
        body: {
          status: "submitted",
          page: 1,
          limit: 15,
        } satisfies IHrmTimeTrackTimesheet.IRequest,
      },
    );
  typia.assert(emptySubmitted);
  TestValidator.equals(
    "submitted status returns empty data array",
    emptySubmitted.data.length,
    0,
  );
  TestValidator.equals(
    "submitted status pagination records is 0",
    emptySubmitted.pagination.records,
    0,
  );
  // 6. Test different status filters - 'rejected'
  const emptyRejected =
    await api.functional.hrmTimeTrack.member.timesheets.index(
      memberConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackTimesheet.IRequest,
      },
    );
  typia.assert(emptyRejected);
  TestValidator.equals(
    "rejected status returns empty data array",
    emptyRejected.data.length,
    0,
  );
  TestValidator.equals(
    "rejected status pagination records is 0",
    emptyRejected.pagination.records,
    0,
  );
  // 7. Test cursor-based pagination with empty results
  const emptyCursor = await api.functional.hrmTimeTrack.member.timesheets.index(
    memberConnection,
    {
      body: {
        cursor: "test_cursor_value",
      } satisfies IHrmTimeTrackTimesheet.IRequest,
    },
  );
  typia.assert(emptyCursor);
  TestValidator.equals(
    "cursor pagination with empty results returns empty data",
    emptyCursor.data.length,
    0,
  );
  TestValidator.equals(
    "cursor pagination with empty results has records 0",
    emptyCursor.pagination.records,
    0,
  );
}
