import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
 * Test manager access to all submitted timesheets across the organization.
 *
 * Validates that a user with time:approve permission (Manager or Owner role) can retrieve all submitted timesheets across the organization for approval purposes. The test verifies authentication as a member, requesting the timesheet list with status filter set to 'submitted', and validates that the response structure includes employee references for each timesheet.
 *
 * The test also validates filtering capabilities including status filtering (draft, submitted, approved, rejected) and date range filtering to retrieve timesheets within specific periods. This ensures the permission-based access control for timesheet approval workflow functions correctly.
 *
 * 1. Member authenticates via join endpoint to obtain access token.
 * 2. Member requests timesheet list with status filter set to 'submitted'.
 * 3. Validates response structure includes pagination metadata and timesheet data array.
 * 4. Validates each timesheet includes employee reference with member information.
 * 5. Tests status filtering by requesting timesheets with different status values.
 * 6. Tests date range filtering to retrieve timesheets within specific periods.
 * 7. Tests pagination parameters to verify correct page size handling.
 */
export async function test_api_timesheet_list_manager_all_submitted_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Request submitted timesheets list
  const submittedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "submitted",
        take: 20,
        skip: 0,
        sort: "week_start_date:DESC",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(submittedTimesheets);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    submittedTimesheets.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(submittedTimesheets.data),
  );
  TestValidator.predicate(
    "current page is valid",
    submittedTimesheets.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    submittedTimesheets.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    submittedTimesheets.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    submittedTimesheets.pagination.pages >= 0,
  );
  // 4. Validate timesheet structure if data exists
  if (submittedTimesheets.data.length > 0) {
    const firstTimesheet = submittedTimesheets.data[0];
    // Validate employee reference structure
    TestValidator.predicate(
      "employee has id",
      firstTimesheet.employee.id !== undefined,
    );
    TestValidator.predicate(
      "employee has member",
      firstTimesheet.employee.member !== undefined,
    );
    TestValidator.predicate(
      "employee member has email",
      firstTimesheet.employee.member.email !== undefined,
    );
    // Validate status is valid enum value
    TestValidator.predicate(
      "status is valid",
      ["draft", "submitted", "approved", "rejected"].includes(
        firstTimesheet.status,
      ),
    );
  }
  // 5. Test status filtering with different statuses
  const allStatuses: Array<"draft" | "submitted" | "approved" | "rejected"> = [
    "draft",
    "submitted",
    "approved",
    "rejected",
  ];
  for (const status of allStatuses) {
    const filteredTimesheets =
      await api.functional.hrmPlatform.member.timesheets.index(
        memberConnection,
        {
          body: {
            status: status,
            take: 10,
            skip: 0,
          } satisfies IHrmPlatformTimesheet.IRequest,
        },
      );
    typia.assert(filteredTimesheets);
    // Validate all returned timesheets match the filtered status
    for (const timesheet of filteredTimesheets.data) {
      TestValidator.equals(
        `timesheet status matches filter (${status})`,
        timesheet.status,
        status,
      );
    }
  }
  // 6. Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_start_date_gte: thirtyDaysAgo.toISOString(),
        week_start_date_lte: now.toISOString(),
        take: 10,
        skip: 0,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(dateFilteredTimesheets);
  // Validate date range filtering returned valid structure
  TestValidator.predicate(
    "date filtered response has pagination",
    dateFilteredTimesheets.pagination !== undefined,
  );
  TestValidator.predicate(
    "date filtered response has data",
    Array.isArray(dateFilteredTimesheets.data),
  );
  // 7. Test pagination parameters
  const paginatedTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        take: 5,
        skip: 0,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(paginatedTimesheets);
  // Validate pagination respects limit
  TestValidator.predicate(
    "page size respects limit",
    paginatedTimesheets.data.length <= 5,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedTimesheets.pagination.limit,
    5,
  );
}
