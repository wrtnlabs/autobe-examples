import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_seller_ban_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 2. Get all ban records to analyze
  const allBansResponse =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
      authorizedConnection,
      {
        body: {
          limit: 100,
          include_unbanned: true,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(allBansResponse);
  TestValidator.predicate("ban records exist", allBansResponse.data.length > 0);
  // 3. Test filter by seller_id
  const sellers = allBansResponse.data.map((ban: IEcommerceMallUserBanOfSeller) => ban.seller.id);
  if (sellers.length > 0) {
    const targetSellerId = RandomGenerator.pick(sellers);
    const filteredBySellerResponse =
      await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
        authorizedConnection,
        {
          body: {
            seller_id: targetSellerId,
            limit: 100,
          } satisfies IEcommerceMallUserBanOfSeller.IRequest,
        },
      );
    typia.assert(filteredBySellerResponse);
    TestValidator.equals(
      "all records match seller_id",
      filteredBySellerResponse.data.every(
        (ban) => ban.seller.id === targetSellerId,
      ),
      true,
    );
    TestValidator.equals(
      "pagination records count",
      filteredBySellerResponse.pagination.records,
      filteredBySellerResponse.data.length,
    );
  }
  // 4. Test filter by reason substring (case-insensitive)
  const reasons = allBansResponse.data.map((ban: IEcommerceMallUserBanOfSeller) => ban.ban.reason);
  if (reasons.length > 0) {
    const testReason = RandomGenerator.pick(reasons);
    const searchTerm = testReason.substring(0, 3).toLowerCase();
    const filteredByReasonResponse =
      await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
        authorizedConnection,
        {
          body: {
            reason: searchTerm,
            limit: 100,
          } satisfies IEcommerceMallUserBanOfSeller.IRequest,
        },
      );
    typia.assert(filteredByReasonResponse);
    TestValidator.equals(
      "all records contain reason substring",
      filteredByReasonResponse.data.every((ban) =>
        ban.ban.reason.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
      true,
    );
  }
  // 5. Test date range filtering
  if (allBansResponse.data.length >= 2) {
    const dates = allBansResponse.data.map((ban: IEcommerceMallUserBanOfSeller) => ban.ban.banned_at);
    dates.sort((a: string, b: string) => a.localeCompare(b));
    const sortedDates = Array.from({ length: Math.min(3, dates.length) }, (_, idx) => dates[idx]);
    if (sortedDates.length >= 2) {
      const bannedAfter = sortedDates[0];
      const bannedBefore = sortedDates[sortedDates.length - 1];
      const filteredByDateResponse =
        await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
          authorizedConnection,
          {
            body: {
              banned_after: bannedAfter,
              banned_before: bannedBefore,
              limit: 100,
            } satisfies IEcommerceMallUserBanOfSeller.IRequest,
          },
        );
      typia.assert(filteredByDateResponse);
      TestValidator.equals(
        "all records within date range",
        filteredByDateResponse.data.every(
          (ban) =>
            ban.ban.banned_at >= bannedAfter &&
            ban.ban.banned_at <= bannedBefore,
        ),
        true,
      );
    }
  }
  // 6. Test combined filters
  if (sellers.length > 0 && reasons.length > 0) {
    const targetSellerId = RandomGenerator.pick(sellers);
    const testReason = RandomGenerator.pick(reasons);
    const searchTerm = testReason.substring(0, 3).toLowerCase();
    const combinedFilterResponse =
      await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
        authorizedConnection,
        {
          body: {
            seller_id: targetSellerId,
            reason: searchTerm,
            limit: 100,
          } satisfies IEcommerceMallUserBanOfSeller.IRequest,
        },
      );
    typia.assert(combinedFilterResponse);
    TestValidator.equals(
      "combined filter seller_id",
      combinedFilterResponse.data.every(
        (ban) => ban.seller.id === targetSellerId,
      ),
      true,
    );
    TestValidator.equals(
      "combined filter reason",
      combinedFilterResponse.data.every((ban) =>
        ban.ban.reason.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
      true,
    );
  }
  // 7. Test sorting by banned_at descending
  const sortedByBannedAtDescResponse =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
      authorizedConnection,
      {
        body: {
          sort_by: "banned_at",
          sort_direction: "desc",
          limit: 100,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(sortedByBannedAtDescResponse);
  TestValidator.predicate(
    "sorted by banned_at descending",
    sortedByBannedAtDescResponse.data.every((ban, idx, array) => {
      if (idx === 0) return true;
      return ban.ban.banned_at <= array[idx - 1].ban.banned_at;
    }),
  );
  // 8. Test sorting by banned_at ascending
  const sortedByBannedAtAscResponse =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
      authorizedConnection,
      {
        body: {
          sort_by: "banned_at",
          sort_direction: "asc",
          limit: 100,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(sortedByBannedAtAscResponse);
  TestValidator.predicate(
    "sorted by banned_at ascending",
    sortedByBannedAtAscResponse.data.every((ban, idx, array) => {
      if (idx === 0) return true;
      return ban.ban.banned_at >= array[idx - 1].ban.banned_at;
    }),
  );
  // 9. Test sorting by created_at
  const sortedByCreatedAtResponse =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
      authorizedConnection,
      {
        body: {
          sort_by: "created_at",
          sort_direction: "desc",
          limit: 100,
        } satisfies IEcommerceMallUserBanOfSeller.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtResponse);
  TestValidator.predicate(
    "sorted by created_at descending",
    sortedByCreatedAtResponse.data.every((ban, idx, array) => {
      if (idx === 0) return true;
      return ban.created_at <= array[idx - 1].created_at;
    }),
  );
  // 10. Test pagination metadata
  TestValidator.equals(
    "pagination pages calculation",
    sortedByBannedAtDescResponse.pagination.pages,
    Math.ceil(
      sortedByBannedAtDescResponse.pagination.records /
        sortedByBannedAtDescResponse.pagination.limit,
    ),
  );
  TestValidator.equals(
    "pagination current page",
    sortedByBannedAtDescResponse.pagination.current,
    1,
  );
}