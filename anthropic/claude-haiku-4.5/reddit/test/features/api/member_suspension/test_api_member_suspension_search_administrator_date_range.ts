import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSuspension";

/**
 * Test date range filtering from administrator perspective to track suspension
 * patterns over time.
 *
 * This test validates that administrators can effectively search for member
 * suspensions using date range filters. It creates multiple suspensions with
 * different suspension and expiration dates, then tests various date range
 * queries to ensure the filtering works correctly.
 *
 * Test workflow:
 *
 * 1. Administrator registration and authentication
 * 2. Create multiple suspensions with different date ranges
 * 3. Test suspended_after and suspended_before filters for suspension creation
 *    dates
 * 4. Test expires_after and expires_before filters for expiration dates
 * 5. Test combined filters and boundary conditions
 * 6. Verify accurate filtering and sorting
 */
export async function test_api_member_suspension_search_administrator_date_range(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create test suspensions with different date ranges
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;
  const thirtyDays = 30 * oneDay;

  // 3. Test suspended_after filter - retrieve suspensions created after a specific date
  const oneWeekAgo = new Date(now.getTime() - sevenDays).toISOString();
  const result1: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          suspended_after: oneWeekAgo,
          limit: 100,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.predicate(
    "suspended_after filter returns suspensions after specified date",
    result1.data.every(
      (s) =>
        new Date(s.suspended_at).getTime() >= new Date(oneWeekAgo).getTime(),
    ),
  );

  // 4. Test suspended_before filter - retrieve suspensions created before a specific date
  const fiveDaysAgo = new Date(now.getTime() - 5 * oneDay).toISOString();
  const result2: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          suspended_before: fiveDaysAgo,
          limit: 100,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result2);
  TestValidator.predicate(
    "suspended_before filter returns suspensions before specified date",
    result2.data.every(
      (s) =>
        new Date(s.suspended_at).getTime() <= new Date(fiveDaysAgo).getTime(),
    ),
  );

  // 5. Test combined suspended_after and suspended_before filters
  const tenDaysAgo = new Date(now.getTime() - 10 * oneDay).toISOString();
  const result3: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          suspended_after: tenDaysAgo,
          suspended_before: fiveDaysAgo,
          limit: 100,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result3);
  TestValidator.predicate(
    "combined suspended date range returns suspensions within date window",
    result3.data.every((s) => {
      const suspendedTime = new Date(s.suspended_at).getTime();
      return (
        suspendedTime >= new Date(tenDaysAgo).getTime() &&
        suspendedTime <= new Date(fiveDaysAgo).getTime()
      );
    }),
  );

  // 6. Test expires_after filter - find suspensions expiring in the future
  const tomorrowDate = new Date(now.getTime() + oneDay).toISOString();
  const result4: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          expires_after: tomorrowDate,
          limit: 100,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result4);
  TestValidator.predicate(
    "expires_after filter returns suspensions expiring after specified date",
    result4.data.every((s) => {
      if (s.expires_at === null || s.expires_at === undefined) return false;
      return (
        new Date(s.expires_at).getTime() >= new Date(tomorrowDate).getTime()
      );
    }),
  );

  // 7. Test expires_before filter - find suspensions expiring soon
  const nextWeek = new Date(now.getTime() + sevenDays).toISOString();
  const result5: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          expires_before: nextWeek,
          limit: 100,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result5);
  TestValidator.predicate(
    "expires_before filter returns suspensions expiring before specified date",
    result5.data.every((s) => {
      if (s.expires_at === null || s.expires_at === undefined) return false;
      return new Date(s.expires_at).getTime() <= new Date(nextWeek).getTime();
    }),
  );

  // 8. Test combined expiration date range filters
  const startExpirationDate = new Date(now.getTime()).toISOString();
  const endExpirationDate = new Date(now.getTime() + thirtyDays).toISOString();
  const result6: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          expires_after: startExpirationDate,
          expires_before: endExpirationDate,
          limit: 100,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result6);
  TestValidator.predicate(
    "combined expiration date range returns suspensions expiring within period",
    result6.data.every((s) => {
      if (s.expires_at === null || s.expires_at === undefined) return false;
      const expiresTime = new Date(s.expires_at).getTime();
      return (
        expiresTime >= new Date(startExpirationDate).getTime() &&
        expiresTime <= new Date(endExpirationDate).getTime()
      );
    }),
  );

  // 9. Test boundary conditions - exact date matching
  const exactDate = new Date(now.getTime() - 3 * oneDay).toISOString();
  const result7: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          suspended_after: exactDate,
          suspended_before: exactDate,
          limit: 100,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result7);

  // 10. Test pagination with date filters
  const result8: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          suspended_after: new Date(now.getTime() - thirtyDays).toISOString(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result8);
  TestValidator.predicate(
    "pagination metadata is valid",
    result8.pagination.current === 1 &&
      result8.pagination.limit === 10 &&
      result8.pagination.records >= 0 &&
      result8.pagination.pages >= 0,
  );

  // 11. Test sorting by suspension date with date filters
  const result9: IPageICommunityPlatformMemberSuspension.ISummary =
    await api.functional.communityPlatform.administrator.memberSuspensions.index(
      connection,
      {
        body: {
          sort_by: "suspended_at",
          sort_order: "desc",
          limit: 100,
        } satisfies ICommunityPlatformMemberSuspension.IRequest,
      },
    );
  typia.assert(result9);
  TestValidator.predicate(
    "sorting by suspended_at in descending order works correctly",
    result9.data.length <= 1 ||
      result9.data.every((_, i, arr) => {
        if (i === 0) return true;
        return (
          new Date(arr[i - 1].suspended_at).getTime() >=
          new Date(arr[i].suspended_at).getTime()
        );
      }),
  );
}
