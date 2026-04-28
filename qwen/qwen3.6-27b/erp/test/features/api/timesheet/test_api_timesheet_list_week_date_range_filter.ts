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
 * Test timesheet listing with week date range filtering for authenticated members.
 *
 * Validates that members can list their own timesheets using week start date range filters (weekStartDate and weekEndDate). The endpoint uses PATCH /hrmPlatform/member/timesheets with optional date range parameters that filter the week_start_date column using inclusive boundary conditions. Tests verify correct filtering when both parameters are provided, when only weekStartDate is provided (filters forward), when only weekEndDate is provided (filters backward), and that results are sorted by week_start_date in descending order. Permission scoping ensures members only see their own timesheets regardless of date range filters.
 *
 * 1. Authenticate as a new member via join
 * 2. Call with both weekStartDate (10 days ago) and weekEndDate (5 days ago)
 * 3. Verify returned timesheets have week_start_date within the specified range
 * 4. Call with only weekStartDate to verify forward filtering
 * 5. Call with only weekEndDate to verify backward filtering
 * 6. Verify results are sorted by week_start_date descending
 */
export async function test_api_timesheet_list_week_date_range_filter(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Calculate date boundaries
  const now = new Date();
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  // 3. Call with both weekStartDate and weekEndDate
  const filteredByRange =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        weekStartDate: tenDaysAgo.toISOString() satisfies string &
          tags.Format<"date-time">,
        weekEndDate: fiveDaysAgo.toISOString() satisfies string &
          tags.Format<"date-time">,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(filteredByRange);
  // 4. Verify all returned timesheets have week_start_date within the range
  for (const timesheet of filteredByRange.data) {
    const weekStart = new Date(timesheet.week_start_date);
    TestValidator.predicate(
      `timesheet ${timesheet.id} week_start_date >= weekStartDate`,
      weekStart >= tenDaysAgo,
    );
    TestValidator.predicate(
      `timesheet ${timesheet.id} week_start_date <= weekEndDate`,
      weekStart <= fiveDaysAgo,
    );
  }
  // 5. Call with only weekStartDate (no weekEndDate)
  const filteredByStartOnly =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        weekStartDate: fifteenDaysAgo.toISOString() satisfies string &
          tags.Format<"date-time">,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(filteredByStartOnly);
  // 6. Verify all returned timesheets have week_start_date >= fifteenDaysAgo
  for (const timesheet of filteredByStartOnly.data) {
    const weekStart = new Date(timesheet.week_start_date);
    TestValidator.predicate(
      `timesheet ${timesheet.id} week_start_date >= ${fifteenDaysAgo.toISOString()}`,
      weekStart >= fifteenDaysAgo,
    );
  }
  // 7. Call with only weekEndDate (no weekStartDate)
  const filteredByEndOnly =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        weekEndDate: now.toISOString() satisfies string &
          tags.Format<"date-time">,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(filteredByEndOnly);
  // 8. Verify all returned timesheets have week_start_date <= now
  for (const timesheet of filteredByEndOnly.data) {
    const weekStart = new Date(timesheet.week_start_date);
    TestValidator.predicate(
      `timesheet ${timesheet.id} week_start_date <= ${now.toISOString()}`,
      weekStart <= now,
    );
  }
  // 9. Verify results are sorted by week_start_date descending
  if (filteredByEndOnly.data.length > 1) {
    for (let i = 0; i < filteredByEndOnly.data.length - 1; i++) {
      const current = new Date(filteredByEndOnly.data[i].week_start_date);
      const next = new Date(filteredByEndOnly.data[i + 1].week_start_date);
      TestValidator.predicate(
        `timesheets are sorted by week_start_date descending at index ${i}`,
        current >= next,
      );
    }
  }
}
