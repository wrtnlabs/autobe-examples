import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayoutPeriodStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayoutPeriodStatistics";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSellerPayoutPeriodStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutPeriodStatistics";

export async function test_api_platform_admin_seller_payout_statistics_empty_result(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin so that we have platformAdmin authorization
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile().slice(0, 15),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a guest cart to satisfy the dependency that some commerce context exists
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "203.0.113.1",
    user_agent: "Mozilla/5.0 (E2E Test GuestCart)",
    referrer: "https://shop.example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert<IShoppingMallGuestCart>(guestCart);

  // 3. Call seller-payouts-by-period statistics with a recent time window
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const statsRequestBody = {
    from: yesterday.toISOString(),
    to: now.toISOString(),
    granularity: "day",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerPayoutPeriodStatistics.IRequest;

  const statsPage: IPageIShoppingMallSellerPayoutPeriodStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.seller_payouts_by_period.index(
      connection,
      {
        body: statsRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerPayoutPeriodStatistics>(statsPage);

  // 4. Business assertions: empty but well-formed result
  const pagination = statsPage.pagination;

  TestValidator.equals(
    "seller payout stats: records should be zero when there are no payouts",
    pagination.records,
    0,
  );

  TestValidator.equals(
    "seller payout stats: pages should be zero when there are no records",
    pagination.pages,
    0,
  );

  TestValidator.equals(
    "seller payout stats: current page index should be zero when empty",
    pagination.current,
    0,
  );

  TestValidator.equals(
    "seller payout stats: limit should reflect requested page size",
    pagination.limit,
    statsRequestBody.limit,
  );

  TestValidator.equals(
    "seller payout stats: data array should be empty when no payouts exist",
    statsPage.data.length,
    0,
  );
}
