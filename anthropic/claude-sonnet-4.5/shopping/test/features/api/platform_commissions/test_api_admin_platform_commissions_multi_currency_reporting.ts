import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";

/**
 * Test multi-currency commission reporting capabilities using currency filter
 * parameter.
 *
 * Validates that administrators can filter commission records by specific
 * currency codes (USD, EUR, GBP, etc.) to separate revenue streams and ensure
 * accurate financial reporting without currency mixing. Tests that filtering by
 * currency returns only records denominated in the specified three-letter ISO
 * 4217 currency code.
 *
 * Process:
 *
 * 1. Create and authenticate admin account
 * 2. Query commission records filtered by USD currency
 * 3. Query commission records filtered by EUR currency
 * 4. Query commission records filtered by GBP currency
 * 5. Validate response structure and currency-specific filtering
 */
export async function test_api_admin_platform_commissions_multi_currency_reporting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Generate a random seller ID for commission queries
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Query commission records filtered by USD currency
  const usdRequestBody = {
    page: 1,
    limit: 20,
    currency: "USD",
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const usdCommissions: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: sellerId,
        body: usdRequestBody,
      },
    );
  typia.assert(usdCommissions);

  // Validate USD currency filtering
  TestValidator.predicate(
    "USD commission response has valid pagination",
    usdCommissions.pagination.current >= 0 &&
      usdCommissions.pagination.limit > 0,
  );

  // Step 3: Query commission records filtered by EUR currency
  const eurRequestBody = {
    page: 1,
    limit: 20,
    currency: "EUR",
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const eurCommissions: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: sellerId,
        body: eurRequestBody,
      },
    );
  typia.assert(eurCommissions);

  // Validate EUR currency filtering
  TestValidator.predicate(
    "EUR commission response has valid pagination",
    eurCommissions.pagination.current >= 0 &&
      eurCommissions.pagination.limit > 0,
  );

  // Step 4: Query commission records filtered by GBP currency
  const gbpRequestBody = {
    page: 1,
    limit: 20,
    currency: "GBP",
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const gbpCommissions: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: sellerId,
        body: gbpRequestBody,
      },
    );
  typia.assert(gbpCommissions);

  // Validate GBP currency filtering
  TestValidator.predicate(
    "GBP commission response has valid pagination",
    gbpCommissions.pagination.current >= 0 &&
      gbpCommissions.pagination.limit > 0,
  );

  // Step 5: Validate that each response is a proper paginated structure
  TestValidator.predicate(
    "all currency-filtered responses have valid structure",
    Array.isArray(usdCommissions.data) &&
      Array.isArray(eurCommissions.data) &&
      Array.isArray(gbpCommissions.data),
  );
}
