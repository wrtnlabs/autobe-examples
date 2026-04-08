import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_members_admin_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const baseDate = new Date("2025-01-01");
  const daysToSpread = 60;
  const testMembers = ArrayUtil.repeat(10, (index) => {
    const createdDate = new Date(
      baseDate.getTime() + index * (daysToSpread / 9),
    );
    return {
      email: `test_member_${index}@example.com`,
      display_name: `Test User ${index}`,
      phone_number: RandomGenerator.mobile(),
      created_at: createdDate.toISOString(),
    };
  });
  const allMembersResult = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(allMembersResult);
  const fromDateString: string & tags.Format<"date"> = "2025-01-15";
  const toDateString: string & tags.Format<"date"> = "2025-02-15";
  const filteredByFromDate = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        from_date: fromDateString,
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(filteredByFromDate);
  TestValidator.predicate("from_date returns members on or after date", () =>
    filteredByFromDate.data.every((m) => {
      const memberDate = new Date(m.created_at);
      const fromDate = new Date(fromDateString);
      fromDate.setHours(0, 0, 0, 0);
      return memberDate >= fromDate;
    }),
  );
  const filteredByToDate = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        to_date: toDateString,
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(filteredByToDate);
  TestValidator.predicate("to_date returns members on or before date", () =>
    filteredByToDate.data.every((m) => {
      const memberDate = new Date(m.created_at);
      const toDate = new Date(toDateString);
      toDate.setHours(23, 59, 59, 999);
      return memberDate <= toDate;
    }),
  );
  const filteredByDateRange = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        from_date: fromDateString,
        to_date: toDateString,
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(filteredByDateRange);
  TestValidator.predicate("date range returns members within range", () =>
    filteredByDateRange.data.every((m) => {
      const memberDate = new Date(m.created_at);
      const fromDate = new Date(fromDateString);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(toDateString);
      toDate.setHours(23, 59, 59, 999);
      return memberDate >= fromDate && memberDate <= toDate;
    }),
  );
  const filteredBySameDay = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        from_date: "2025-01-20",
        to_date: "2025-01-20",
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(filteredBySameDay);
  TestValidator.predicate("same day filter returns members on that date", () =>
    filteredBySameDay.data.every((m) => {
      const memberDate = new Date(m.created_at);
      const targetDate = new Date("2025-01-20");
      targetDate.setHours(0, 0, 0, 0);
      const dayEnd = new Date("2025-01-20");
      dayEnd.setHours(23, 59, 59, 999);
      return memberDate >= targetDate && memberDate <= dayEnd;
    }),
  );
  const filteredByFutureDate = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        from_date: "2030-01-01" as string & tags.Format<"date">,
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(filteredByFutureDate);
  TestValidator.equals(
    "future from_date returns no members",
    filteredByFutureDate.data.length,
    0,
  );
  const filteredWithDisabledDates =
    await api.functional.ecommerceMall.members.index(adminConnection, {
      body: {
        limit: 100,
        page: 1,
      },
    });
  typia.assert(filteredWithDisabledDates);
  TestValidator.predicate(
    "no date filter returns all members",
    () =>
      filteredWithDisabledDates.pagination.records >=
      allMembersResult.pagination.records,
  );
  const filteredCombined = await api.functional.ecommerceMall.members.index(
    adminConnection,
    {
      body: {
        from_date: fromDateString,
        to_date: toDateString,
        email: "test_member",
        limit: 100,
        page: 1,
      },
    },
  );
  typia.assert(filteredCombined);
  TestValidator.predicate(
    "combined filter works correctly",
    () =>
      filteredCombined.data.length <= filteredByDateRange.data.length &&
      filteredCombined.data.every((m) => {
        const memberDate = new Date(m.created_at);
        const fromDate = new Date(fromDateString);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(toDateString);
        toDate.setHours(23, 59, 59, 999);
        return memberDate >= fromDate && memberDate <= toDate;
      }),
  );
  TestValidator.predicate("pagination metadata is correct", () => {
    TestValidator.equals(
      "current page is 1",
      filteredByDateRange.pagination.current,
      1,
    );
    TestValidator.equals(
      "limit is 100",
      filteredByDateRange.pagination.limit,
      100,
    );
    TestValidator.predicate(
      "records matches data length",
      () =>
        filteredByDateRange.pagination.records ===
          filteredByDateRange.data.length ||
        filteredByDateRange.pagination.records >
          filteredByDateRange.data.length,
    );
    TestValidator.predicate(
      "pages is calculated correctly",
      () =>
        filteredByDateRange.pagination.pages ===
        Math.ceil(
          filteredByDateRange.pagination.records /
            filteredByDateRange.pagination.limit,
        ),
    );
    return true;
  });
}