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
 * Test administrative revenue analysis scenarios using commission record
 * filtering.
 *
 * Validates that admins can perform comprehensive financial queries including:
 *
 * - Total platform revenue by time period using date range filters
 * - Commission revenue by seller tier and commission type
 * - Refund impact analysis separating gross from net revenue
 * - Currency-specific revenue analysis for multi-currency marketplaces
 * - Combined filter scenarios for detailed financial reporting
 * - Order and seller-specific commission queries
 * - Amount and subtotal range filtering
 *
 * The test creates an admin account, authenticates, and executes various filter
 * combinations to ensure the revenue analysis API supports complex financial
 * queries required for platform management and fiscal reporting.
 */
export async function test_api_admin_platform_commissions_revenue_analysis(
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

  // Generate random IDs for testing
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const orderId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Test basic pagination without filters
  const basicRequest = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const basicResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: basicRequest },
    );
  typia.assert(basicResult);
  TestValidator.equals(
    "basic pagination current page",
    basicResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic pagination limit",
    basicResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    basicResult.pagination.records >= 0,
  );

  // Step 3: Test commission type filtering for revenue analysis
  const commissionTypes = [
    "standard",
    "category_specific",
    "seller_tier",
    "promotional",
  ];
  const selectedCommissionType = RandomGenerator.pick(commissionTypes);

  const commissionTypeRequest = {
    page: 1,
    limit: 20,
    commission_type: selectedCommissionType,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const commissionTypeResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: commissionTypeRequest },
    );
  typia.assert(commissionTypeResult);

  // Step 4: Test currency-specific revenue analysis
  const currencies = ["USD", "EUR", "GBP", "JPY", "KRW"];
  const selectedCurrency = RandomGenerator.pick(currencies);

  const currencyRequest = {
    page: 1,
    limit: 20,
    currency: selectedCurrency,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const currencyResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: currencyRequest },
    );
  typia.assert(currencyResult);

  // Step 5: Test refund impact analysis
  const refundedRequest = {
    page: 1,
    limit: 20,
    is_refunded: true,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const refundedResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: refundedRequest },
    );
  typia.assert(refundedResult);

  const nonRefundedRequest = {
    page: 1,
    limit: 20,
    is_refunded: false,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const nonRefundedResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: nonRefundedRequest },
    );
  typia.assert(nonRefundedResult);

  // Step 6: Test date range filtering for fiscal period analysis
  const startDate = new Date("2024-01-01T00:00:00Z");
  const endDate = new Date("2024-12-31T23:59:59Z");

  const dateRangeRequest = {
    page: 1,
    limit: 20,
    created_after: startDate.toISOString(),
    created_before: endDate.toISOString(),
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const dateRangeResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: dateRangeRequest },
    );
  typia.assert(dateRangeResult);

  // Step 7: Test order_id filtering
  const orderIdRequest = {
    page: 1,
    limit: 20,
    order_id: orderId,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const orderIdResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: orderIdRequest },
    );
  typia.assert(orderIdResult);

  // Step 8: Test seller_id filtering
  const specificSellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerIdRequest = {
    page: 1,
    limit: 20,
    seller_id: specificSellerId,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const sellerIdResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: sellerIdRequest },
    );
  typia.assert(sellerIdResult);

  // Step 9: Test combined filters - commission type + currency
  const combinedRequest1 = {
    page: 1,
    limit: 20,
    commission_type: selectedCommissionType,
    currency: selectedCurrency,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const combinedResult1: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: combinedRequest1 },
    );
  typia.assert(combinedResult1);

  // Step 10: Test combined filters - date range + refund status
  const combinedRequest2 = {
    page: 1,
    limit: 20,
    created_after: startDate.toISOString(),
    created_before: endDate.toISOString(),
    is_refunded: false,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const combinedResult2: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: combinedRequest2 },
    );
  typia.assert(combinedResult2);

  // Step 11: Test commission amount range filtering
  const amountRangeRequest = {
    page: 1,
    limit: 20,
    min_commission_amount: 10,
    max_commission_amount: 1000,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const amountRangeResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: amountRangeRequest },
    );
  typia.assert(amountRangeResult);

  // Step 12: Test refunded amount range filtering
  const refundedAmountRequest = {
    page: 1,
    limit: 20,
    min_refunded_amount: 5,
    max_refunded_amount: 500,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const refundedAmountResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: refundedAmountRequest },
    );
  typia.assert(refundedAmountResult);

  // Step 13: Test order subtotal range filtering
  const orderSubtotalRequest = {
    page: 1,
    limit: 20,
    min_order_subtotal: 100,
    max_order_subtotal: 5000,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const orderSubtotalResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: orderSubtotalRequest },
    );
  typia.assert(orderSubtotalResult);

  // Step 14: Test sorting by commission amount
  const sortByCommissionAmount = {
    page: 1,
    limit: 20,
    sort_by: "commission_amount" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const sortedByAmountResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: sortByCommissionAmount },
    );
  typia.assert(sortedByAmountResult);

  // Step 15: Test sorting by order subtotal
  const sortByOrderSubtotal = {
    page: 1,
    limit: 20,
    sort_by: "order_subtotal" as const,
    sort_order: "asc" as const,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const sortedBySubtotalResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: sortByOrderSubtotal },
    );
  typia.assert(sortedBySubtotalResult);

  // Step 16: Test comprehensive filter combination for detailed revenue analysis
  const comprehensiveRequest = {
    page: 1,
    limit: 50,
    commission_type: "standard",
    currency: "USD",
    is_refunded: false,
    min_commission_amount: 5,
    max_commission_amount: 500,
    created_after: new Date("2024-06-01T00:00:00Z").toISOString(),
    created_before: new Date("2024-12-31T23:59:59Z").toISOString(),
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallPlatformCommission.IRequest;

  const comprehensiveResult: IPageIShoppingMallPlatformCommission.ISummary =
    await api.functional.shoppingMall.admin.sellers.platformCommissions.index(
      connection,
      { sellerId, body: comprehensiveRequest },
    );
  typia.assert(comprehensiveResult);
  TestValidator.equals(
    "comprehensive result pagination current page",
    comprehensiveResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "comprehensive result pagination limit",
    comprehensiveResult.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "comprehensive result has valid page count",
    comprehensiveResult.pagination.pages >= 0,
  );
}
