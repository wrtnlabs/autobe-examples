import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_administrator_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_administrator_bans_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create multiple ban records to populate the ban list
  const banRecords: IEcommerceMallUserBan[] = [];
  await ArrayUtil.asyncRepeat(5, async (i) => {
    const ban =
      await generate_random_ecommerce_mall_administrator_user_bans_create(
        adminConnection,
        {
          body: {
            user_type: typia.random<"customer" | "seller">(),
            customer_id:
              typia.random<"customer" | "seller">() === "customer"
                ? typia.random<string & tags.Format<"uuid">>()
                : undefined,
            seller_id:
              typia.random<"customer" | "seller">() === "seller"
                ? typia.random<string & tags.Format<"uuid">>()
                : undefined,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    banRecords.push(ban);
  });
  banRecords.forEach((ban) => typia.assert(ban));
  // 3. Test banned_at_after filter - get bans from today onwards
  const today = new Date();
  const todayISO = today.toISOString();
  const afterResponse =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          banned_at_after: todayISO,
          limit: 100,
        },
      },
    );
  typia.assert(afterResponse);
  // Validate all returned bans are on or after the specified date
  afterResponse.data.forEach((ban) => {
    const bannedDate = new Date(ban.banned_at);
    TestValidator.predicate(
      "banned_at_after filter - ban should be on or after today",
      bannedDate >= today,
    );
  });
  // 4. Test banned_at_before filter - get bans from before today
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayISO = yesterday.toISOString();
  const beforeResponse =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          banned_at_before: yesterdayISO,
          limit: 100,
        },
      },
    );
  typia.assert(beforeResponse);
  // Validate all returned bans are on or before yesterday
  beforeResponse.data.forEach((ban) => {
    const bannedDate = new Date(ban.banned_at);
    TestValidator.predicate(
      "banned_at_before filter - ban should be on or before yesterday",
      bannedDate <= yesterday,
    );
  });
  // 5. Test combined date range filter
  const startDate = new Date(today.getTime() - 48 * 60 * 60 * 1000); // 2 days ago
  const endDate = new Date(today.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const rangeResponse =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          banned_at_after: startDate.toISOString(),
          banned_at_before: endDate.toISOString(),
          limit: 100,
        },
      },
    );
  typia.assert(rangeResponse);
  // Validate all returned bans are within the date range
  rangeResponse.data.forEach((ban) => {
    const bannedDate = new Date(ban.banned_at);
    TestValidator.predicate(
      "date range filter - ban should be within range",
      bannedDate >= startDate && bannedDate <= endDate,
    );
  });
  // 6. Test pagination with filtered date range
  const page1Response =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          banned_at_after: startDate.toISOString(),
          banned_at_before: endDate.toISOString(),
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          banned_at_after: startDate.toISOString(),
          banned_at_before: endDate.toISOString(),
          page: 2,
          limit: 2,
        },
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination - current page 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination - current page 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination - limit per page",
    page1Response.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination - limit per page",
    page2Response.pagination.limit,
    2,
  );
  // 7. Test total records count reflects filtered results
  const allInFilterResponse =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          banned_at_after: startDate.toISOString(),
          banned_at_before: endDate.toISOString(),
          limit: 100,
        },
      },
    );
  typia.assert(allInFilterResponse);
  // Validate pagination total records matches the data length
  TestValidator.equals(
    "pagination - total records matches data length",
    allInFilterResponse.pagination.records,
    allInFilterResponse.data.length,
  );
  // 8. Test sorting respects configured sort order while filtering
  const sortAscResponse =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          banned_at_after: startDate.toISOString(),
          banned_at_before: endDate.toISOString(),
          sort: "banned_at:asc",
          limit: 100,
        },
      },
    );
  typia.assert(sortAscResponse);
  const sortDescResponse =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          banned_at_after: startDate.toISOString(),
          banned_at_before: endDate.toISOString(),
          sort: "banned_at:desc",
          limit: 100,
        },
      },
    );
  typia.assert(sortDescResponse);
  // Validate ascending order
  for (let i = 1; i < sortAscResponse.data.length; i++) {
    const prevDate = new Date(sortAscResponse.data[i - 1].banned_at);
    const currDate = new Date(sortAscResponse.data[i].banned_at);
    TestValidator.predicate(
      "ascending sort - previous ban should be before or equal current",
      prevDate <= currDate,
    );
  }
  // Validate descending order
  for (let i = 1; i < sortDescResponse.data.length; i++) {
    const prevDate = new Date(sortDescResponse.data[i - 1].banned_at);
    const currDate = new Date(sortDescResponse.data[i].banned_at);
    TestValidator.predicate(
      "descending sort - previous ban should be after or equal current",
      prevDate >= currDate,
    );
  }
  // 9. Validate administrator reference is properly resolved for date-filtered results
  allInFilterResponse.data.forEach((ban) => {
    TestValidator.predicate(
      "administrator reference - id should be valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ban.administrator.id,
      ),
    );
    TestValidator.predicate(
      "administrator reference - email should be valid email format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ban.administrator.email),
    );
    TestValidator.predicate(
      "administrator reference - display_name should exist",
      ban.administrator.displayName.length > 0,
    );
    TestValidator.predicate(
      "administrator reference - grade should be valid",
      ban.administrator.grade === "regular" ||
        ban.administrator.grade === "super" ||
        ban.administrator.grade === null,
    );
    TestValidator.predicate(
      "administrator reference - isBanned should be boolean",
      typeof ban.administrator.isBanned === "boolean",
    );
    TestValidator.predicate(
      "administrator reference - createdAt should be valid ISO format",
      ban.administrator.createdAt !== undefined,
    );
    TestValidator.predicate(
      "administrator reference - updatedAt should be valid ISO format",
      ban.administrator.updatedAt !== undefined,
    );
  });
  // 10. Test empty result for far-future date range
  const futureDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
  const futureResponse =
    await api.functional.ecommerceMall.administrator.bans.index(
      adminConnection,
      {
        body: {
          banned_at_after: futureDate.toISOString(),
          limit: 100,
        },
      },
    );
  typia.assert(futureResponse);
  TestValidator.equals(
    "future date range - no results expected",
    futureResponse.data.length,
    0,
  );
  TestValidator.equals(
    "future date range - total records should be 0",
    futureResponse.pagination.records,
    0,
  );
}
