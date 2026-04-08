import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetWeeklyStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_weekly_stats_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create test connection for authenticated member
  const memberTestConnection: api.IConnection = { host: connection.host };
  memberTestConnection.headers = { ...memberConnection.headers };
  if (memberAuth.token.access) {
    memberTestConnection.headers.Authorization = `Bearer ${memberAuth.token.access}`;
  }
  // 3. Test default sorting (week_start DESC - newest first)
  const defaultSortResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      memberTestConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultSortResponse);
  // 4. Test sorting by total_hours DESC
  const totalHoursDescResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      memberTestConnection,
      {
        body: {
          sort: "total_hours",
          order: "DESC",
        },
      },
    );
  typia.assert(totalHoursDescResponse);
  // 5. Test sorting by total_hours ASC
  const totalHoursAscResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      memberTestConnection,
      {
        body: {
          sort: "total_hours",
          order: "ASC",
        },
      },
    );
  typia.assert(totalHoursAscResponse);
  // 6. Test week_start sorting explicitly
  const weekStartDescResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      memberTestConnection,
      {
        body: {
          sort: "week_start",
          order: "DESC",
        },
      },
    );
  typia.assert(weekStartDescResponse);
  // 7. Test offset-based pagination (page/limit)
  const page1Response =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      memberTestConnection,
      {
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      memberTestConnection,
      {
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(page2Response);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "pagination current is number",
    typeof page1Response.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof page1Response.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is number",
    typeof page1Response.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof page1Response.pagination.pages,
    "number",
  );
  TestValidator.equals(
    "pagination current >= 1",
    page1Response.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit > 0",
    page1Response.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records >= 0",
    page1Response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages >= 0",
    page1Response.pagination.pages >= 0,
    true,
  );
  // 9. Validate sorting order for total_hours DESC
  if (totalHoursDescResponse.data.length > 1) {
    const hoursDesc = totalHoursDescResponse.data.map(
      (item) => item.total_hours,
    );
    for (let i = 1; i < hoursDesc.length; i++) {
      TestValidator.predicate(
        "hours DESC sorted correctly", // [i-1] >= [i] means descending
        hoursDesc[i - 1] >= hoursDesc[i],
      );
    }
  }
  // 10. Validate sorting order for total_hours ASC
  if (totalHoursAscResponse.data.length > 1) {
    const hoursAsc = totalHoursAscResponse.data.map((item) => item.total_hours);
    for (let i = 1; i < hoursAsc.length; i++) {
      TestValidator.predicate(
        "hours ASC sorted correctly", // [i-1] <= [i] means ascending
        hoursAsc[i - 1] <= hoursAsc[i],
      );
    }
  }
  // 11. Validate sorting order for week_start DESC (ISO 8601 datetime comparison)
  if (weekStartDescResponse.data.length > 1) {
    const weekStarts = weekStartDescResponse.data.map(
      (item) => item.week_start,
    );
    for (let i = 1; i < weekStarts.length; i++) {
      TestValidator.predicate(
        "week_start DESC sorted correctly",
        weekStarts[i - 1] >= weekStarts[i],
      );
    }
  }
  // 12. Validate combined filtering and sorting
  const filteredSortedResponse =
    await api.functional.hrmPlatform.member.timesheet_weekly_stats.index(
      memberTestConnection,
      {
        body: {
          sort: "total_hours",
          order: "DESC",
          timesheet_count: {
            gte: 1,
          },
        },
      },
    );
  typia.assert(filteredSortedResponse);
  // Verify filtered results still respect sorting
  if (filteredSortedResponse.data.length > 1) {
    const hoursAfterFilter = filteredSortedResponse.data.map(
      (item) => item.total_hours,
    );
    for (let i = 1; i < hoursAfterFilter.length; i++) {
      TestValidator.predicate(
        "filtered results sorted correctly",
        hoursAfterFilter[i - 1] >= hoursAfterFilter[i],
      );
    }
  }
  // 13. Verify page 1 and page 2 return different data
  TestValidator.notEquals(
    "page 1 and page 2 differ",
    page1Response.data.map((item) => item.id).join(","),
    page2Response.data.map((item) => item.id).join(","),
  );
  // 14. Verify pagination metadata consistency
  TestValidator.equals(
    "pages calculated correctly",
    page1Response.pagination.pages,
    Math.ceil(
      page1Response.pagination.records / page1Response.pagination.limit,
    ),
  );
}
