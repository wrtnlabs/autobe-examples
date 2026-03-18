import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
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
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_list_filter_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create member-specific connection
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Create employee record
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        employment_type: "full-time",
      } as IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 3. Create timesheets for different weeks with different statuses
  // Week 1: Current week - draft status
  const now = new Date();
  const mondayOfWeek1 = new Date(now);
  mondayOfWeek1.setDate(now.getDate() - now.getDay() + 1);
  mondayOfWeek1.setHours(0, 0, 0, 0);
  const timesheet1 =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: mondayOfWeek1.toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet1);
  TestValidator.equals(
    "timesheet1 status is draft",
    timesheet1.status,
    "draft",
  );
  // Week 2: Next week - will be submitted
  const mondayOfWeek2 = new Date(mondayOfWeek1);
  mondayOfWeek2.setDate(mondayOfWeek1.getDate() + 7);
  const timesheet2 =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: mondayOfWeek2.toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet2);
  TestValidator.equals(
    "timesheet2 status is draft",
    timesheet2.status,
    "draft",
  );
  // Week 3: Previous week - for date range testing
  const mondayOfWeek3 = new Date(mondayOfWeek1);
  mondayOfWeek3.setDate(mondayOfWeek1.getDate() - 7);
  const timesheet3 =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: mondayOfWeek3.toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet3);
  TestValidator.equals(
    "timesheet3 status is draft",
    timesheet3.status,
    "draft",
  );
  // 4. Test filtering by status - get all timesheets first
  const allTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(allTimesheets);
  TestValidator.predicate(
    "has at least 3 timesheets",
    allTimesheets.data.length >= 3,
  );
  TestValidator.equals(
    "pagination records count",
    allTimesheets.pagination.records,
    allTimesheets.data.length,
  );
  // 5. Test filtering by status (draft)
  const draftTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "draft",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(draftTimesheets);
  TestValidator.predicate(
    "all returned timesheets are draft",
    draftTimesheets.data.every((ts) => ts.status === "draft"),
  );
  TestValidator.equals(
    "draft pagination records",
    draftTimesheets.pagination.records,
    draftTimesheets.data.length,
  );
  // 6. Test filtering by date range
  const dateRangeTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_start_date_from: mondayOfWeek1.toISOString(),
        week_start_date_to: mondayOfWeek2.toISOString(),
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(dateRangeTimesheets);
  TestValidator.predicate(
    "all timesheets within date range",
    dateRangeTimesheets.data.every(
      (ts) =>
        new Date(ts.week_start_date) >= mondayOfWeek1 &&
        new Date(ts.week_start_date) <= mondayOfWeek2,
    ),
  );
  // 7. Test combined status and date range filter
  const combinedFilter =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "draft",
        week_start_date_from: mondayOfWeek1.toISOString(),
        week_start_date_to: mondayOfWeek2.toISOString(),
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter - all draft and in range",
    combinedFilter.data.every(
      (ts) =>
        ts.status === "draft" &&
        new Date(ts.week_start_date) >= mondayOfWeek1 &&
        new Date(ts.week_start_date) <= mondayOfWeek2,
    ),
  );
  // 8. Test empty result set with date range that has no timesheets
  const futureMonday = new Date(mondayOfWeek2);
  futureMonday.setDate(futureMonday.getDate() + 14);
  const futureMondayEnd = new Date(futureMonday);
  futureMondayEnd.setDate(futureMondayEnd.getDate() + 7);
  const emptyResult = await api.functional.hrmPlatform.member.timesheets.index(
    memberConnection,
    {
      body: {
        week_start_date_from: futureMonday.toISOString(),
        week_start_date_to: futureMondayEnd.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimesheet.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data array", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals(
    "empty result current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("empty result limit", emptyResult.pagination.limit, 20);
  // 9. Test pagination with limit
  const paginatedResult =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination limit value",
    paginatedResult.pagination.limit,
    2,
  );
  // 10. Test pagination page 2
  if (allTimesheets.pagination.records > 2) {
    const page2Result =
      await api.functional.hrmPlatform.member.timesheets.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: 2,
          } satisfies IHrmPlatformTimesheet.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current page",
      page2Result.pagination.current,
      2,
    );
  }
}