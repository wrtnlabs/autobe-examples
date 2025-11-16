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
 * Test administrative analysis of commission records by order transaction size.
 *
 * This test validates that administrators can effectively segment and analyze
 * platform commission revenue by filtering on the underlying order value
 * (order_subtotal). The test verifies filtering scenarios including high-value
 * orders, low-value orders, and specific order value ranges to enable analysis
 * of commission patterns across different transaction sizes.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Query baseline commission data
 * 3. Filter by minimum order subtotal (high-value orders)
 * 4. Filter by maximum order subtotal (low-value orders)
 * 5. Filter by order subtotal ranges
 * 6. Combine order subtotal filters with commission amount filters
 * 7. Validate all filtering results
 */
export async function test_api_admin_platform_commissions_order_subtotal_analysis(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Query baseline commission data without filters
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  const baselineRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const baselineResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: sellerId,
        body: baselineRequest,
      },
    );
  typia.assert(baselineResult);

  // Step 3: Filter by minimum order subtotal to find high-value order commissions
  const minSubtotalThreshold = 1000;
  const minSubtotalRequest = {
    page: 1,
    limit: 20,
    min_order_subtotal: minSubtotalThreshold,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const minSubtotalResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: sellerId,
        body: minSubtotalRequest,
      },
    );
  typia.assert(minSubtotalResult);

  // Validate all returned records have order_subtotal >= min_order_subtotal
  for (const commission of minSubtotalResult.data) {
    TestValidator.predicate(
      "commission order_subtotal meets minimum threshold",
      commission.order_subtotal >= minSubtotalThreshold,
    );
  }

  // Step 4: Filter by maximum order subtotal to find low-value order commissions
  const maxSubtotalThreshold = 500;
  const maxSubtotalRequest = {
    page: 1,
    limit: 20,
    max_order_subtotal: maxSubtotalThreshold,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const maxSubtotalResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: sellerId,
        body: maxSubtotalRequest,
      },
    );
  typia.assert(maxSubtotalResult);

  // Validate all returned records have order_subtotal <= max_order_subtotal
  for (const commission of maxSubtotalResult.data) {
    TestValidator.predicate(
      "commission order_subtotal meets maximum threshold",
      commission.order_subtotal <= maxSubtotalThreshold,
    );
  }

  // Step 5: Filter by specific order value range
  const rangeMinSubtotal = 500;
  const rangeMaxSubtotal = 2000;
  const rangeSubtotalRequest = {
    page: 1,
    limit: 20,
    min_order_subtotal: rangeMinSubtotal,
    max_order_subtotal: rangeMaxSubtotal,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const rangeSubtotalResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: sellerId,
        body: rangeSubtotalRequest,
      },
    );
  typia.assert(rangeSubtotalResult);

  // Validate all returned records are within the order subtotal range
  for (const commission of rangeSubtotalResult.data) {
    TestValidator.predicate(
      "commission order_subtotal within specified range",
      commission.order_subtotal >= rangeMinSubtotal &&
        commission.order_subtotal <= rangeMaxSubtotal,
    );
  }

  // Step 6: Test combination with commission amount filters
  const combinedRequest = {
    page: 1,
    limit: 20,
    min_order_subtotal: 1000,
    max_order_subtotal: 5000,
    min_commission_amount: 50,
    max_commission_amount: 500,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const combinedResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      {
        sellerId: sellerId,
        body: combinedRequest,
      },
    );
  typia.assert(combinedResult);

  // Validate all returned records satisfy both order subtotal and commission amount criteria
  for (const commission of combinedResult.data) {
    TestValidator.predicate(
      "commission meets combined order subtotal criteria",
      commission.order_subtotal >= 1000 && commission.order_subtotal <= 5000,
    );
    TestValidator.predicate(
      "commission meets combined commission amount criteria",
      commission.commission_amount >= 50 && commission.commission_amount <= 500,
    );
  }

  // Step 7: Validate pagination metadata for filtered results
  TestValidator.predicate(
    "pagination current page is valid",
    combinedResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    combinedResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    combinedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    combinedResult.pagination.pages >= 0,
  );
}
