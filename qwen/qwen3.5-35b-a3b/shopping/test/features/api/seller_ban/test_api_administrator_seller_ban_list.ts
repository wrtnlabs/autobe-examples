import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_ban_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    },
  });
  typia.assert(adminResult);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminResult.token.access;
  // 2. Test default pagination (page=1, limit=20)
  const defaultRequest: IEcommerceMallUserBanOfSeller.IRequest = {};
  const defaultResponse: IPageIEcommerceMallUserBanOfSeller =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
      adminConnection,
      { body: defaultRequest },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // 3. Test filtering by seller_id
  if (defaultResponse.data.length > 0) {
    const firstSellerId = defaultResponse.data[0].seller.id;
    const sellerIdRequest: IEcommerceMallUserBanOfSeller.IRequest = {
      seller_id: firstSellerId,
    };
    const filteredResponse: IPageIEcommerceMallUserBanOfSeller =
      await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
        adminConnection,
        { body: sellerIdRequest },
      );
    typia.assert(filteredResponse);
    TestValidator.equals(
      "all records have matching seller_id",
      true,
      filteredResponse.data.every(
        (record) => record.seller.id === firstSellerId,
      ),
    );
  }
  // 4. Test ban reason search (case-insensitive substring)
  if (defaultResponse.data.length > 0) {
    const firstReason = defaultResponse.data[0].ban.reason;
    const reasonSearch = firstReason.substring(
      0,
      Math.max(3, firstReason.length / 2),
    );
    const reasonRequest: IEcommerceMallUserBanOfSeller.IRequest = {
      reason: reasonSearch,
    };
    const reasonFilteredResponse: IPageIEcommerceMallUserBanOfSeller =
      await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
        adminConnection,
        { body: reasonRequest },
      );
    typia.assert(reasonFilteredResponse);
    TestValidator.equals(
      "reason search returns matching records",
      true,
      reasonFilteredResponse.data.every((record) =>
        record.ban.reason.toLowerCase().includes(reasonSearch.toLowerCase()),
      ),
    );
  }
  // 5. Test date range filtering
  if (defaultResponse.data.length >= 2) {
    const sortedByDate = [...defaultResponse.data].sort(
      (a, b) =>
        new Date(b.ban.banned_at).getTime() -
        new Date(a.ban.banned_at).getTime(),
    );
    const recentBannedAt = sortedByDate[0].ban.banned_at;
    const olderBannedAt = sortedByDate[1]?.ban.banned_at || recentBannedAt;
    const dateRangeRequest: IEcommerceMallUserBanOfSeller.IRequest = {
      banned_after: olderBannedAt,
      banned_before: recentBannedAt,
    };
    const dateFilteredResponse: IPageIEcommerceMallUserBanOfSeller =
      await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
        adminConnection,
        { body: dateRangeRequest },
      );
    typia.assert(dateFilteredResponse);
    TestValidator.equals(
      "date filter returns records within range",
      true,
      dateFilteredResponse.data.every(
        (record) =>
          record.ban.banned_at >= olderBannedAt &&
          record.ban.banned_at <= recentBannedAt,
      ),
    );
  }
  // 6. Test combined filters
  if (defaultResponse.data.length > 0) {
    const firstSellerId = defaultResponse.data[0].seller.id;
    const firstReason = defaultResponse.data[0].ban.reason;
    const firstBannedAt = defaultResponse.data[0].ban.banned_at;
    const secondBannedAt =
      defaultResponse.data[1]?.ban.banned_at || firstBannedAt;
    const reasonSubstring = firstReason.substring(
      0,
      Math.max(3, firstReason.length / 2),
    );
    const combinedRequest: IEcommerceMallUserBanOfSeller.IRequest = {
      seller_id: firstSellerId,
      reason: reasonSubstring,
      banned_after: secondBannedAt,
      banned_before: firstBannedAt,
    };
    const combinedResponse: IPageIEcommerceMallUserBanOfSeller =
      await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
        adminConnection,
        { body: combinedRequest },
      );
    typia.assert(combinedResponse);
    TestValidator.equals(
      "combined filters return matching records",
      true,
      combinedResponse.data.every(
        (record) =>
          record.seller.id === firstSellerId &&
          record.ban.reason
            .toLowerCase()
            .includes(reasonSubstring.toLowerCase()) &&
          record.ban.banned_at >= secondBannedAt &&
          record.ban.banned_at <= firstBannedAt,
      ),
    );
  }
  // 7. Verify sorting by banned_at descending (newest first)
  if (defaultResponse.data.length > 1) {
    for (let i = 0; i < defaultResponse.data.length - 1; i++) {
      const currentBannedAt = new Date(defaultResponse.data[i].ban.banned_at);
      const nextBannedAt = new Date(defaultResponse.data[i + 1].ban.banned_at);
      TestValidator.predicate(
        `records sorted by banned_at descending at index ${i}`,
        currentBannedAt >= nextBannedAt,
      );
    }
  }
  // 8. Verify each record has required fields
  if (defaultResponse.data.length > 0) {
    const sampleRecord = defaultResponse.data[0];
    TestValidator.equals(
      "record has ban with reason",
      typeof sampleRecord.ban.reason,
      "string",
    );
    TestValidator.equals(
      "record has ban with banned_at",
      typeof sampleRecord.ban.banned_at,
      "string",
    );
    TestValidator.equals(
      "record has ban with user_type seller",
      sampleRecord.ban.user_type,
      "seller",
    );
    TestValidator.equals(
      "record has seller with email",
      typeof sampleRecord.seller.email,
      "string",
    );
    TestValidator.equals(
      "record has seller with display_name",
      typeof sampleRecord.seller.display_name,
      "string",
    );
    TestValidator.equals(
      "deleted_at is null for active bans",
      sampleRecord.deleted_at,
      null,
    );
  }
  // 9. Test pagination with page=2
  if (defaultResponse.pagination.pages > 1) {
    const page1Records = defaultResponse.data.map((r) => r.id);
    const page2Request: IEcommerceMallUserBanOfSeller.IRequest = {
      page: 2,
      limit: 20,
    };
    const page2Response: IPageIEcommerceMallUserBanOfSeller =
      await api.functional.ecommerceMall.administrator.user_ban_of_sellers.index(
        adminConnection,
        { body: page2Request },
      );
    typia.assert(page2Response);
    const page2Records = page2Response.data.map((r) => r.id);
    TestValidator.equals(
      "page 2 returns correct current page",
      page2Response.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "page 2 has different data than page 1",
      page1Records,
      page2Records,
    );
  }
}
