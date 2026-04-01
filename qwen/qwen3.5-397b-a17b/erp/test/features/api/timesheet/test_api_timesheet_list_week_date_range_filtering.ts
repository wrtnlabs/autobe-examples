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
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_list_week_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create timesheets for 4 different weeks
  // Week 1: 2024-01-01 (Monday) to 2024-01-07 (Sunday)
  const week1Start = "2024-01-01";
  const week1End = "2024-01-07";
  const timesheet1 =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week1Start,
          week_end_date: week1End,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet1);
  // Week 2: 2024-01-08 (Monday) to 2024-01-14 (Sunday)
  const week2Start = "2024-01-08";
  const week2End = "2024-01-14";
  const timesheet2 =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week2Start,
          week_end_date: week2End,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet2);
  // Week 3: 2024-01-15 (Monday) to 2024-01-21 (Sunday)
  const week3Start = "2024-01-15";
  const week3End = "2024-01-21";
  const timesheet3 =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week3Start,
          week_end_date: week3End,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet3);
  // Week 4: 2024-01-22 (Monday) to 2024-01-28 (Sunday)
  const week4Start = "2024-01-22";
  const week4End = "2024-01-28";
  const timesheet4 =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week4Start,
          week_end_date: week4End,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet4);
  const allTimesheets = [timesheet1, timesheet2, timesheet3, timesheet4];
  // 3. Test filtering by week_start_date only (from week2 onwards)
  const filteredByStartDate =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_start_date: week2Start,
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(filteredByStartDate);
  TestValidator.predicate(
    "week_start_date filter returns timesheets from specified date onwards",
    () =>
      filteredByStartDate.data.every((ts) => ts.week_start_date >= week2Start),
  );
  TestValidator.predicate(
    "week_start_date filter includes week2, week3, week4",
    () =>
      filteredByStartDate.data.some((ts) => ts.id === timesheet2.id) &&
      filteredByStartDate.data.some((ts) => ts.id === timesheet3.id) &&
      filteredByStartDate.data.some((ts) => ts.id === timesheet4.id),
  );
  // 4. Test filtering by week_end_date only (up to week2)
  const filteredByEndDate =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_end_date: week2End,
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(filteredByEndDate);
  TestValidator.predicate(
    "week_end_date filter returns timesheets ending at specified date or before",
    () => filteredByEndDate.data.every((ts) => ts.week_end_date <= week2End),
  );
  TestValidator.predicate(
    "week_end_date filter includes week1 and week2",
    () =>
      filteredByEndDate.data.some((ts) => ts.id === timesheet1.id) &&
      filteredByEndDate.data.some((ts) => ts.id === timesheet2.id),
  );
  // 5. Test combined week_start_date and week_end_date filtering
  const filteredByDateRange =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_start_date: week2Start,
        week_end_date: week3End,
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(filteredByDateRange);
  TestValidator.predicate(
    "combined date range filter returns timesheets within range",
    () =>
      filteredByDateRange.data.every(
        (ts) =>
          ts.week_start_date >= week2Start && ts.week_end_date <= week3End,
      ),
  );
  TestValidator.predicate(
    "date range filter includes week2 and week3 only",
    () =>
      filteredByDateRange.data.some((ts) => ts.id === timesheet2.id) &&
      filteredByDateRange.data.some((ts) => ts.id === timesheet3.id) &&
      !filteredByDateRange.data.some((ts) => ts.id === timesheet1.id) &&
      !filteredByDateRange.data.some((ts) => ts.id === timesheet4.id),
  );
  // 6. Validate week periods follow Monday-Sunday structure (7 days apart)
  for (const ts of allTimesheets) {
    const startDate = new Date(ts.week_start_date);
    const endDate = new Date(ts.week_end_date);
    const diffDays =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    TestValidator.equals(
      `week period for ${ts.id} is 7 days (Monday to Sunday)`,
      diffDays,
      6,
    );
  }
  // 7. Test pagination with date range filtering
  const paginatedResult =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_start_date: week1Start,
        week_end_date: week4End,
        page: 1,
        limit: 2,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    () => paginatedResult.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination has correct structure",
    () =>
      paginatedResult.pagination.current >= 1 &&
      paginatedResult.pagination.limit === 2 &&
      paginatedResult.pagination.records >= 4 &&
      paginatedResult.pagination.pages >= 2,
  );
  // 8. Verify business rule: duplicate timesheet for same week should fail
  await TestValidator.error(
    "duplicate timesheet for same week should be rejected",
    async () => {
      await generate_random_hrm_platform_member_timesheets_create(
        memberConnection,
        {
          body: {
            week_start_date: week1Start,
            week_end_date: week1End,
          } satisfies IHrmPlatformTimesheet.ICreate,
        },
      );
    },
  );
}
