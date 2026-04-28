import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing timesheets with status filter for regular member (own timesheets only).
 *
 * Validates that a regular member (without time:approve or time:manage permissions) can query their own timesheets filtered by workflow status. Verifies response structure, pagination metadata consistency, status filtering behavior, and permission scoping that restricts results to only the authenticated employee's timesheets.
 *
 * Tests multiple status filters (draft, approved, submitted, none) to confirm each restriction works correctly. Also validates that employee summary data is properly populated in each returned timesheet, including member name and department references.
 *
 * 1. Register and authenticate a new member (creates default organization and employee record).
 * 2. Query timesheets filtered by status 'draft' and validate response structure.
 * 3. Validate pagination metadata (current, limit, records, pages) are consistent.
 * 4. Verify each timesheet includes employee information with member details.
 * 5. Query with status 'approved' filter and validate only approved status results.
 * 6. Query with status 'submitted' filter and validate only submitted status results.
 * 7. Query without status filter and validate all accessible timesheets returned.
 * 8. When multiple timesheets returned, verify sorting by week_start_date descending.
 */
export async function test_api_timesheet_list_own_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Query timesheets with status 'draft' filter
  const draftTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: { status: "draft" } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(draftTimesheets);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "draft pagination current is positive",
    draftTimesheets.pagination.current >= 1,
  );
  TestValidator.predicate(
    "draft pagination limit is positive",
    draftTimesheets.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "draft pagination records is non-negative",
    draftTimesheets.pagination.records >= 0,
  );
  TestValidator.predicate(
    "draft pagination pages is non-negative",
    draftTimesheets.pagination.pages >= 0,
  );
  TestValidator.equals(
    "draft pagination current matches request",
    draftTimesheets.pagination.current,
    1,
  );
  // 4. Validate each draft timesheet has correct structure
  await ArrayUtil.asyncForEach(draftTimesheets.data, async (ts) => {
    typia.assert(ts);
    // Validate employee information is populated
    typia.assert(ts.employee);
    TestValidator.predicate(
      "draft timesheet employee has valid id",
      ts.employee.id !== "",
    );
    typia.assert(ts.employee.member);
    TestValidator.predicate(
      "draft timesheet employee member has display name",
      ts.employee.member.display_name !== "",
    );
    typia.assert(ts.employee.role);
    TestValidator.predicate(
      "draft timesheet employee has valid role",
      ts.employee.role.name !== "",
    );
    // Validate timesheet fields
    TestValidator.equals("draft timesheet status is draft", ts.status, "draft");
    TestValidator.predicate(
      "draft timesheet has valid week_start_date",
      ts.week_start_date !== "",
    );
    TestValidator.predicate(
      "draft timesheet has valid week_end_date",
      ts.week_end_date !== "",
    );
    TestValidator.predicate(
      "draft timesheet total_hours is non-negative",
      ts.total_hours >= 0,
    );
  });
  // 5. Query with status 'approved' filter
  const approvedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: { status: "approved" } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(approvedTimesheets);
  TestValidator.equals(
    "approved pagination current defaults to 1",
    approvedTimesheets.pagination.current,
    1,
  );
  // Validate each approved timesheet has status 'approved'
  await ArrayUtil.asyncForEach(approvedTimesheets.data, async (ts) => {
    typia.assert(ts);
    TestValidator.equals(
      "timesheet filtered to approved status",
      ts.status,
      "approved",
    );
  });
  // 6. Query with status 'submitted' filter
  const submittedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: { status: "submitted" } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(submittedTimesheets);
  // Validate each submitted timesheet has status 'submitted'
  await ArrayUtil.asyncForEach(submittedTimesheets.data, async (ts) => {
    typia.assert(ts);
    TestValidator.equals(
      "timesheet filtered to submitted status",
      ts.status,
      "submitted",
    );
  });
  // 7. Query without status filter (all timesheets)
  const allTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {} satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(allTimesheets);
  TestValidator.equals(
    "all timesheets pagination current defaults to 1",
    allTimesheets.pagination.current,
    1,
  );
  // 8. When multiple timesheets returned, verify sorted by week_start_date DESC
  if (allTimesheets.data.length >= 2) {
    await ArrayUtil.asyncForEach(
      allTimesheets.data.slice(0, -1),
      async (ts, idx) => {
        const nextTs = allTimesheets.data[idx + 1];
        typia.assert(ts);
        typia.assert(nextTs);
        TestValidator.predicate(
          "timesheets sorted by week_start_date descending",
          new Date(ts.week_start_date).getTime() >=
            new Date(nextTs.week_start_date).getTime(),
        );
      },
    );
  }
  // Validate permission scoping: member only sees their own timesheets
  await ArrayUtil.asyncForEach(allTimesheets.data, async (ts) => {
    typia.assert(ts.employee);
    typia.assert(ts.employee.member);
    TestValidator.equals(
      "member only sees own timesheets - email matches",
      ts.employee.member.email,
      authorized.email,
    );
  });
}
