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
 * Test timesheet list filtering by status and date range, including handling of empty result sets.
 *
 * Validates the complete timesheet filtering workflow including member authentication, status-based filtering, date range filtering, combined filter scenarios, and empty result set handling. Ensures that the API correctly returns filtered timesheets and proper pagination metadata even when no records match the criteria.
 *
 * Special attention is given to verifying that empty result sets return valid pagination structure with records=0, pages=0, and empty data array, as well as confirming that status and date range filters can be combined effectively.
 *
 * 1. Member registers and authenticates to access timesheet endpoints.
 * 2. Tests default list retrieval without filters to establish baseline.
 * 3. Tests filtering by each status value (draft, submitted, approved, rejected).
 * 4. Tests date range filtering with week_start_date_gte and week_start_date_lte.
 * 5. Tests combined status and date range filters.
 * 6. Tests empty result scenario with non-matching filter criteria.
 * 7. Validates pagination metadata structure for both populated and empty results.
 * 8. Tests pagination parameters (take, skip) for result navigation.
 */
export async function test_api_timesheet_list_filtering_and_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test default list retrieval (no filters) - baseline
  const defaultResult =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {} satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default result has valid pagination",
    () => defaultResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default result has valid records count",
    () => defaultResult.pagination.records >= 0,
  );
  // 3. Test filtering by each status value
  const statuses = ["draft", "submitted", "approved", "rejected"] as const;
  for (const status of statuses) {
    const statusResult =
      await api.functional.hrmPlatform.member.timesheets.index(
        memberConnection,
        {
          body: {
            status: status,
          } satisfies IHrmPlatformTimesheet.IRequest,
        },
      );
    typia.assert(statusResult);
    // Validate all returned timesheets match the filtered status
    for (const timesheet of statusResult.data) {
      TestValidator.equals(
        `timesheet status matches filter: ${status}`,
        timesheet.status,
        status,
      );
    }
  }
  // 4. Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        week_start_date_gte: thirtyDaysAgo.toISOString(),
        week_start_date_lte: thirtyDaysFuture.toISOString(),
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(dateRangeResult);
  // Validate all returned timesheets are within date range
  for (const timesheet of dateRangeResult.data) {
    TestValidator.predicate(
      `timesheet week_start_date >= ${thirtyDaysAgo.toISOString()}`,
      () => timesheet.week_start_date >= thirtyDaysAgo.toISOString(),
    );
    TestValidator.predicate(
      `timesheet week_start_date <= ${thirtyDaysFuture.toISOString()}`,
      () => timesheet.week_start_date <= thirtyDaysFuture.toISOString(),
    );
  }
  // 5. Test combined status and date range filters
  const combinedResult =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: "draft",
        week_start_date_gte: thirtyDaysAgo.toISOString(),
        week_start_date_lte: thirtyDaysFuture.toISOString(),
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(combinedResult);
  // Validate all returned timesheets match both filters
  for (const timesheet of combinedResult.data) {
    TestValidator.equals(
      "combined filter status matches",
      timesheet.status,
      "draft",
    );
    TestValidator.predicate(
      "combined filter date range valid",
      () =>
        timesheet.week_start_date >= thirtyDaysAgo.toISOString() &&
        timesheet.week_start_date <= thirtyDaysFuture.toISOString(),
    );
  }
  // 6. Test empty result scenario with non-matching criteria
  // Use a date range that should have no timesheets (far past)
  const farPast = new Date("2000-01-01T00:00:00.000Z");
  const farPastEnd = new Date("2000-01-31T23:59:59.999Z");
  const emptyResult = await api.functional.hrmPlatform.member.timesheets.index(
    memberConnection,
    {
      body: {
        week_start_date_gte: farPast.toISOString(),
        week_start_date_lte: farPastEnd.toISOString(),
      } satisfies IHrmPlatformTimesheet.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Validate empty result structure
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result data array is empty",
    emptyResult.data.length,
    0,
  );
  TestValidator.predicate(
    "empty result has valid current page",
    () => emptyResult.pagination.current >= 1,
  );
  // 7. Test pagination parameters (take, skip)
  const paginatedResult =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        take: 5,
        skip: 0,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "paginated result respects take limit",
    () => paginatedResult.data.length <= 5,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResult.pagination.limit,
    5,
  );
  // 8. Test with different take value
  const paginatedResult2 =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        take: 10,
        skip: 0,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(paginatedResult2);
  TestValidator.predicate(
    "paginated result respects take limit 10",
    () => paginatedResult2.data.length <= 10,
  );
  TestValidator.equals(
    "pagination limit matches request 10",
    paginatedResult2.pagination.limit,
    10,
  );
}
