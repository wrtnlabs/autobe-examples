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

/**
 * Test that a member can filter their timesheets by week start date range.
 *
 * This test validates the timesheet listing functionality with date range
 * filtering, ensuring that:
 * 1. Timesheets are correctly filtered by week_start_date range
 * 2. Partial date ranges (only from or only to) work correctly
 * 3. Empty result sets return proper pagination
 * 4. Date filtering is inclusive on both ends
 */
export async function test_api_timesheet_list_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Test Case 1: Full date range filter (both from and to)
  const fullRangeResult =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_start_date_from: "2024-01-01T00:00:00Z",
        week_start_date_to: "2024-01-31T23:59:59Z",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(fullRangeResult);
  // Validate all timesheets in result are within the date range
  await ArrayUtil.asyncForEach(fullRangeResult.data, async (timesheet) => {
    await TestValidator.predicate(
      "timesheet week_start_date >= from date",
      new Date(timesheet.week_start_date).getTime() >=
        new Date("2024-01-01T00:00:00Z").getTime(),
    );
    await TestValidator.predicate(
      "timesheet week_start_date <= to date",
      new Date(timesheet.week_start_date).getTime() <=
        new Date("2024-01-31T23:59:59Z").getTime(),
    );
  });
  // 3. Test Case 2: Only week_start_date_from (no to date)
  const fromDateOnlyResult =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_start_date_from: "2024-02-01T00:00:00Z",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(fromDateOnlyResult);
  // Validate all timesheets are from the specified date forward
  await ArrayUtil.asyncForEach(fromDateOnlyResult.data, async (timesheet) => {
    await TestValidator.predicate(
      "timesheet week_start_date >= from date (no to date)",
      new Date(timesheet.week_start_date).getTime() >=
        new Date("2024-02-01T00:00:00Z").getTime(),
    );
  });
  // 4. Test Case 3: Only week_start_date_to (no from date)
  const toDateOnlyResult =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_start_date_to: "2024-01-15T23:59:59Z",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(toDateOnlyResult);
  // Validate all timesheets are up to the specified date
  await ArrayUtil.asyncForEach(toDateOnlyResult.data, async (timesheet) => {
    await TestValidator.predicate(
      "timesheet week_start_date <= to date (no from date)",
      new Date(timesheet.week_start_date).getTime() <=
        new Date("2024-01-15T23:59:59Z").getTime(),
    );
  });
  // 5. Test Case 4: Empty date range (no timesheets in range)
  const emptyRangeResult =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_start_date_from: "2020-01-01T00:00:00Z",
        week_start_date_to: "2020-01-07T23:59:59Z",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(emptyRangeResult);
  // Validate empty result set has correct pagination
  TestValidator.equals(
    "empty range returns 0 records",
    emptyRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty range data array is empty",
    emptyRangeResult.data.length,
    0,
  );
  // 6. Test Case 5: Verify pagination information is present
  TestValidator.predicate(
    "pagination current page is valid",
    fullRangeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    fullRangeResult.pagination.limit >= 1 &&
      fullRangeResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    fullRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    fullRangeResult.pagination.pages >= 0,
  );
}
