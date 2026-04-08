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
 * Test that an authenticated employee can view their own timesheets through the list endpoint.
 *
 * Validates the timesheet listing functionality for authenticated employees, ensuring that only the employee's own timesheets are returned with correct structure and pagination. Verifies that timesheet summaries include all required fields such as status, week dates, total hours, employee information, and approver details when applicable.
 *
 * The test confirms that the timesheet list endpoint properly filters results to the authenticated employee's timesheets and returns them in the expected format with accurate pagination metadata.
 *
 * 1. Register and authenticate a new member account using authorize_member_join utility.
 * 2. Call PATCH /hrmTimeTrack/member/timesheets with empty request body to retrieve all timesheets.
 * 3. Validate the response structure as IPageIHrmTimeTrackTimesheet.ISummary with pagination metadata.
 * 4. Verify each timesheet belongs to the authenticated employee by checking employee.id matches member.id.
 * 5. Confirm timesheet fields: id, status, week_start_date, week_end_date, total_hours, employee, and approver.
 * 6. Validate pagination metadata: current, limit, records, pages are all present and valid.
 */
export async function test_api_timesheet_employee_view_own_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection);
  typia.assert(member);
  // 2. Request timesheets list with empty body (no filters)
  const request = {} satisfies IHrmTimeTrackTimesheet.IRequest;
  const response = await api.functional.hrmTimeTrack.member.timesheets.index(
    memberConnection,
    { body: request },
  );
  typia.assert(response);
  // 3. Validate business logic: all timesheets belong to authenticated employee
  for (const timesheet of response.data) {
    // Verify timesheet belongs to authenticated employee
    TestValidator.equals(
      "timesheet belongs to authenticated employee",
      timesheet.employee.member.id,
      member.id,
    );
    // Verify timesheet status is valid
    TestValidator.predicate(
      "timesheet has valid status",
      ["draft", "submitted", "approved", "rejected"].includes(timesheet.status),
    );
    // Verify approver is null for non-approved timesheets
    if (timesheet.status !== "approved") {
      TestValidator.equals(
        "non-approved timesheet has null approver",
        timesheet.approver,
        null,
      );
    }
    // Verify approved timesheets have approver information
    if (timesheet.status === "approved") {
      TestValidator.predicate(
        "approved timesheet has approver",
        timesheet.approver !== null,
      );
    }
  }
  // 4. Validate pagination consistency
  TestValidator.predicate(
    "data array length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // 5. Validate pagination records consistency
  TestValidator.predicate(
    "pagination records count is consistent",
    response.pagination.records >= response.data.length,
  );
}
