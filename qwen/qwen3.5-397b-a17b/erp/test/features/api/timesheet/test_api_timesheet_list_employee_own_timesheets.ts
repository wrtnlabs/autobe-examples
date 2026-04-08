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
 * Test employee retrieval of their own timesheet list with pagination.
 *
 * Validates that an authenticated employee can access the timesheet list endpoint and receive properly structured paginated results. The test verifies authentication flow, response structure validation, pagination metadata correctness, and timesheet summary field completeness.
 *
 * The test ensures that the API returns only timesheets accessible to the authenticated employee through organization context filtering. Each timesheet in the response must contain all required fields including week period dates, workflow status, computed total hours, and employee/reviewer references.
 *
 * 1. Member registers with unique email and credentials using authorize_member_join utility.
 * 2. Employee connection is established with authentication token from registration.
 * 3. Timesheet list is requested with default pagination parameters.
 * 4. Validates pagination metadata contains current page, limit, total records, and total pages.
 * 5. Validates each timesheet summary contains all required fields with correct types.
 * 6. Verifies timesheets are sorted by week_start_date in descending order when multiple records exist.
 */
export async function test_api_timesheet_list_employee_own_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Request timesheet list with default pagination
  const timesheetList =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        take: 20,
        skip: 0,
        sort: "week_start_date:DESC",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(timesheetList);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    timesheetList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    timesheetList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "total records is non-negative",
    timesheetList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    timesheetList.pagination.pages >= 0,
  );
  // 4. Validate timesheet data array structure
  TestValidator.predicate("data is array", Array.isArray(timesheetList.data));
  // 5. Validate sorting order (descending by week_start_date) when multiple records exist
  if (timesheetList.data.length > 1) {
    for (let i = 0; i < timesheetList.data.length - 1; i++) {
      const current = timesheetList.data[i];
      const next = timesheetList.data[i + 1];
      TestValidator.predicate(
        "timesheets sorted by week_start_date DESC",
        new Date(current.week_start_date).getTime() >=
          new Date(next.week_start_date).getTime(),
      );
    }
  }
}
