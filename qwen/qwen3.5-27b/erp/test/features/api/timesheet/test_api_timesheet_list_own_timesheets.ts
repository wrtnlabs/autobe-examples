import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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

export async function test_api_timesheet_list_own_timesheets(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated member can retrieve their own timesheets with default pagination.
   * This test verifies that the timesheet listing endpoint correctly filters timesheets by the
   * authenticated employee, applies default pagination settings, and returns properly structured
   * timesheet summary data with correct sorting order.
   */
  // 1. Setup: Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Test Execution: List timesheets with default parameters (empty body)
  const timesheetsResponse =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {} satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(timesheetsResponse);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    timesheetsResponse.pagination.current >= 1,
  );
  TestValidator.equals(
    "default limit is 20",
    timesheetsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    timesheetsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    timesheetsResponse.pagination.pages >= 0,
  );
  // 4. Validate timesheet data if exists
  if (timesheetsResponse.data.length > 0) {
    // Verify first timesheet structure
    const firstTimesheet = timesheetsResponse.data[0];
    // Verify employee information in timesheet
    TestValidator.equals(
      "employee member id matches authenticated member",
      firstTimesheet.employee.member.id,
      member.id,
    );
    // Verify sorting: timesheets should be ordered by week_start_date descending
    if (timesheetsResponse.data.length > 1) {
      for (let i = 0; i < timesheetsResponse.data.length - 1; i++) {
        const current = timesheetsResponse.data[i];
        const next = timesheetsResponse.data[i + 1];
        TestValidator.predicate(
          `timesheet ${i} week_start_date >= timesheet ${i + 1} week_start_date (descending order)`,
          new Date(current.week_start_date) >= new Date(next.week_start_date),
        );
      }
    }
    // Verify status values are valid
    const validStatuses = [
      "draft",
      "submitted",
      "approved",
      "rejected",
    ] as const;
    for (const timesheet of timesheetsResponse.data) {
      TestValidator.predicate(
        `timesheet ${timesheet.id} has valid status`,
        validStatuses.some((status) => timesheet.status === status),
      );
    }
    // Verify total_hours is non-negative
    for (const timesheet of timesheetsResponse.data) {
      TestValidator.predicate(
        `timesheet ${timesheet.id} has non-negative total_hours`,
        timesheet.total_hours >= 0,
      );
    }
  }
  // 5. Test with explicit pagination parameters
  const paginatedResponse =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "explicit page is 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit limit is 10",
    paginatedResponse.pagination.limit,
    10,
  );
  // 6. Test with status filter
  const draftTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "draft",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(draftTimesheets);
  // Verify all returned timesheets have draft status
  for (const timesheet of draftTimesheets.data) {
    TestValidator.equals(
      `filtered timesheet ${timesheet.id} has draft status`,
      timesheet.status,
      "draft",
    );
  }
}
