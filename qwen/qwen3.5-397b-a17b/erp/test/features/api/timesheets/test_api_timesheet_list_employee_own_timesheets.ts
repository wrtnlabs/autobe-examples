import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
 * Test that an authenticated employee can successfully retrieve their own timesheet list.
 *
 * This test verifies:
 * 1. Member authentication via join endpoint
 * 2. Timesheet list retrieval with proper pagination structure
 * 3. Response contains all required fields validated by typia.assert()
 * 4. Pagination metadata is correct (current, limit, records, pages)
 * 5. Only authenticated employee's timesheets are returned
 * 6. Default sorting by week_start_date descending
 */
export async function test_api_timesheet_list_employee_own_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve timesheet list for authenticated employee
  const timesheetResponse =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "week_start_date:desc",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(timesheetResponse);
  // 3. Validate pagination metadata business logic
  TestValidator.predicate(
    "current page is at least 1",
    timesheetResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is at least 1",
    timesheetResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    timesheetResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    timesheetResponse.pagination.pages >= 0,
  );
  // 4. Validate each timesheet summary business logic
  for (const timesheet of timesheetResponse.data) {
    // Validate employee belongs to authenticated member
    TestValidator.equals(
      "timesheet employee matches authenticated member",
      timesheet.employee.user.id,
      authorized.id,
    );
    // Validate total_hours is non-negative
    TestValidator.predicate(
      "total_hours is non-negative",
      timesheet.total_hours >= 0,
    );
    // Validate status is one of expected values
    TestValidator.predicate(
      "status is valid enum value",
      ["draft", "submitted", "approved", "rejected"].includes(timesheet.status),
    );
  }
  // 5. Validate sorting order (week_start_date descending)
  if (timesheetResponse.data.length > 1) {
    for (let i = 0; i < timesheetResponse.data.length - 1; i++) {
      const current = timesheetResponse.data[i];
      const next = timesheetResponse.data[i + 1];
      TestValidator.predicate(
        `timesheet ${i} week_start_date >= timesheet ${i + 1} (descending order)`,
        current.week_start_date >= next.week_start_date,
      );
    }
  }
}
