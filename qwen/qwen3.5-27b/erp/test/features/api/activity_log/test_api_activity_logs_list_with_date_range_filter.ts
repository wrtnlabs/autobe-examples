import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackActivityLog";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test activity logs listing with date range filtering for authenticated members.
 *
 * Validates that an authenticated member can retrieve paginated activity logs filtered by a specific date range. The test verifies that all returned logs have timestamps within the specified range and that the response structure conforms to the expected pagination format.
 *
 * This test ensures proper date range filtering, pagination metadata accuracy, and correct relation population for activity log entries.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create a date range filter with from_date and to_date parameters.
 * 3. Call the activity logs endpoint with the date range filter.
 * 4. Validate the response structure and pagination metadata.
 * 5. Verify all returned logs are within the specified date range.
 * 6. Confirm required fields and optional entity references are properly structured.
 */
export async function test_api_activity_logs_list_with_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create date range filter parameters
  const now = new Date();
  const from_date = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const to_date = now.toISOString(); // current time
  const body = {
    from_date,
    to_date,
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackActivityLog.IRequest;
  // 3. Call the activity logs endpoint with date range filter
  const output = await api.functional.hrmTimeTrack.member.activity_logs.index(
    memberConnection,
    { body },
  );
  typia.assert(output);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", output.pagination.current, 1);
  TestValidator.equals("limit matches request", output.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate("pages count is valid", output.pagination.pages >= 0);
  // 5. Verify all returned logs are within the specified date range
  await ArrayUtil.asyncForEach(output.data, async (log) => {
    typia.assert(log);
    // Validate date range filtering (business logic test)
    const logDate = new Date(log.created_at).getTime();
    const fromDate = new Date(from_date).getTime();
    const toDate = new Date(to_date).getTime();
    TestValidator.predicate(
      `log created_at is within range [${from_date}, ${to_date}]`,
      logDate >= fromDate && logDate <= toDate,
    );
    // Validate organization and member relations (already validated by typia.assert)
    typia.assert(log.organization);
    typia.assert(log.member);
    // Validate optional entity references are properly typed when present
    if (log.employee !== null && log.employee !== undefined) {
      typia.assert(log.employee);
    }
    if (log.project !== null && log.project !== undefined) {
      typia.assert(log.project);
    }
    if (log.task !== null && log.task !== undefined) {
      typia.assert(log.task);
    }
    if (log.timesheet !== null && log.timesheet !== undefined) {
      typia.assert(log.timesheet);
    }
    if (log.role !== null && log.role !== undefined) {
      typia.assert(log.role);
    }
    if (log.employeeContract !== null && log.employeeContract !== undefined) {
      typia.assert(log.employeeContract);
    }
    if (log.department !== null && log.department !== undefined) {
      typia.assert(log.department);
    }
  });
  // 6. Validate pagination consistency
  if (output.pagination.records > 0) {
    TestValidator.predicate(
      "data array length matches limit or records",
      output.data.length <= output.pagination.limit &&
        output.data.length <= output.pagination.records,
    );
  }
}
