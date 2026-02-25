import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test advanced filtering capabilities when retrieving banned sellers.
 * Validates filtering by account_status, search term, date ranges, and combination filters.
 */
export async function test_api_admin_user_ban_banned_sellers_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerce.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Generate adminUserBanId
  const adminUserBanId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Filter by account_status='suspended'
  const suspendedOnlyResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          account_status: "suspended",
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(suspendedOnlyResponse);
  // Validate all returned sellers have 'suspended' status
  for (const seller of suspendedOnlyResponse.data) {
    TestValidator.equals(
      "seller account status should be suspended",
      seller.account_status,
      "suspended",
    );
  }
  // Test 2: Search filtering by partial shop_name
  const searchTerm = RandomGenerator.alphabets(3);
  const searchResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate all returned sellers contain search term (case insensitive)
  if (searchResponse.data.length > 0) {
    for (const seller of searchResponse.data) {
      TestValidator.predicate(
        `seller shop name should contain search term '${searchTerm}'`,
        seller.shop_name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
  }
  // Test 3: Combined filters
  const now = new Date();
  const oneMonthAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const combineResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          search: RandomGenerator.alphabets(2),
          account_status: "suspended",
          created_after: oneMonthAgo,
          created_before: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(combineResponse);
  // Validate combined filter results
  if (combineResponse.data.length > 0) {
    for (const seller of combineResponse.data) {
      TestValidator.equals(
        "combined filter status",
        seller.account_status,
        "suspended",
      );
      TestValidator.predicate(
        "created_at should be within date range",
        seller.created_at >= oneMonthAgo &&
          seller.created_at <= now.toISOString(),
      );
    }
  }
  // Test 4: Empty result set (no matching records)
  const emptyResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          account_status: "invalid_status_that_does_not_exist",
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "invalid status should return empty result",
    emptyResponse.data.length,
    0,
  );
  // Test 5: Date range with no bans
  const farFuture = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const noRecordsResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          created_after: farFuture,
          page: 1,
          limit: 10,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(noRecordsResponse);
  TestValidator.equals(
    "future date range should return empty result",
    noRecordsResponse.data.length,
    0,
  );
  // Test 6: Pagination validation
  const paginationResponse =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.index(
      adminConnection,
      {
        adminUserBanId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceSeller.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination metadata should be valid",
    paginationResponse.pagination.current === 2 &&
      paginationResponse.pagination.limit === 5 &&
      paginationResponse.pagination.pages >= 0 &&
      paginationResponse.pagination.records >= 0,
  );
}
