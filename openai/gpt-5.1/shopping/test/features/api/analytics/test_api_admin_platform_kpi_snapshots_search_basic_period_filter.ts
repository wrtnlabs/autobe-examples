import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformKpiSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpiSnapshot";

/**
 * Validate basic period-filtered search and pagination for platform KPI
 * snapshots.
 *
 * Business context
 *
 * - Admins use this endpoint to retrieve aggregated KPI snapshots (GMV, NMV,
 *   orders, refunds, etc.) over daily/weekly/monthly windows for analytics
 *   dashboards.
 * - Background jobs materialize rows in shopping_mall_platform_kpi_snapshots;
 *   tests must not attempt to create those rows directly.
 *
 * Test goals
 *
 * 1. Ensure an authenticated admin can call the search endpoint successfully.
 * 2. Verify that the request body of type
 *    IShoppingMallPlatformKpiSnapshot.IRequest with a simple daily period
 *    window is accepted and processed.
 * 3. Validate that pagination metadata (IPage.IPagination) in the response is
 *    consistent with the requested page and limit.
 * 4. When data exists, validate that:
 *
 *    - All returned snapshots are for the requested period type ("day").
 *    - Period_start values fall within the requested [from, to] window.
 *    - Core numeric KPI metrics are non-negative.
 *    - Records are ordered by period_start in descending order.
 * 5. When no data exists for the filter, the test still passes as long as types
 *    and pagination metadata are valid; it must not assume non-empty data.
 */
export async function test_api_admin_platform_kpi_snapshots_search_basic_period_filter(
  connection: api.IConnection,
) {
  // 1. Admin join (auth) to obtain an authenticated admin context.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd-Admin",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create at least one analytics-related global config to ensure platform
  //    is in a configured state. Exact semantics are not important here; use a
  //    synthetic analytics namespace payload.
  const configBody = {
    namespace: "analytics",
    config_key: `daily-kpi-window-${RandomGenerator.alphabets(6)}`,
    environment: "test",
    description: "Test analytics configuration for KPI snapshot search E2E.",
    value_json: JSON.stringify({
      kpiTypes: ["gmv", "nmv", "orders"],
      enabled: true,
    }),
    is_active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configBody,
    });
  typia.assert(createdConfig);

  // 3. Prepare a simple daily period window for the KPI snapshot search.
  //    Use a recent 7-day window ending at "now".
  const now: Date = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fromDate: Date = new Date(now.getTime() - sevenDaysMs);

  const periodStartFrom: string & tags.Format<"date-time"> =
    fromDate.toISOString() as string & tags.Format<"date-time">;
  const periodStartTo: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;

  const page = 1 as number & tags.Type<"int32">;
  const limit = 20 as number & tags.Type<"int32">;

  const requestBody = {
    periodTypes: ["day"],
    periodStartFrom,
    periodStartTo,
    page,
    limit,
    orderBy: "period_start",
    orderDirection: "desc",
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  // 4. Call KPI snapshot search endpoint.
  const pageResult: IPageIShoppingMallPlatformKpiSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.platformKpiSnapshots.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 5. Validate pagination metadata.
  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination current page should equal requested page",
    page,
    pagination.current,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    limit,
    pagination.limit,
  );
  TestValidator.predicate(
    "pagination records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be non-negative",
    pagination.pages >= 0,
  );

  // 6. Conditional validation depending on whether data array is empty.
  const data: IShoppingMallPlatformKpiSnapshot.ISummary[] = pageResult.data;

  if (data.length === 0) {
    // When no snapshots match the filter, we only validate types and basic
    // pagination metadata; an empty result set is acceptable.
    TestValidator.equals(
      "when no data, data array should be empty",
      0,
      data.length,
    );
    return;
  }

  // When there is data, validate per-record constraints.
  // 6-1. All snapshots must have period_type === "day".
  for (const snapshot of data) {
    typia.assert(snapshot);

    TestValidator.equals(
      "snapshot period_type should match requested filter (day)",
      "day",
      snapshot.period_type,
    );

    // 6-2. period_start within [periodStartFrom, periodStartTo].
    const startTime = new Date(snapshot.period_start).getTime();
    const fromTime = new Date(periodStartFrom).getTime();
    const toTime = new Date(periodStartTo).getTime();

    TestValidator.predicate(
      "snapshot period_start should be >= requested periodStartFrom",
      startTime >= fromTime,
    );
    TestValidator.predicate(
      "snapshot period_start should be <= requested periodStartTo",
      startTime <= toTime,
    );

    // 6-3. Core numeric KPI metrics must be non-negative.
    TestValidator.predicate(
      "gmv_amount should be non-negative",
      snapshot.gmv_amount >= 0,
    );
    TestValidator.predicate(
      "nmv_amount should be non-negative",
      snapshot.nmv_amount >= 0,
    );
    TestValidator.predicate(
      "platform_revenue_amount should be non-negative",
      snapshot.platform_revenue_amount >= 0,
    );
    TestValidator.predicate(
      "take_rate should be non-negative",
      snapshot.take_rate >= 0,
    );
    TestValidator.predicate(
      "order_count should be non-negative",
      snapshot.order_count >= 0,
    );
    TestValidator.predicate(
      "paid_order_count should be non-negative",
      snapshot.paid_order_count >= 0,
    );
    TestValidator.predicate(
      "active_customer_count should be non-negative",
      snapshot.active_customer_count >= 0,
    );
    TestValidator.predicate(
      "new_customer_count should be non-negative",
      snapshot.new_customer_count >= 0,
    );
    TestValidator.predicate(
      "active_seller_count should be non-negative",
      snapshot.active_seller_count >= 0,
    );
    TestValidator.predicate(
      "refund_request_count should be non-negative",
      snapshot.refund_request_count >= 0,
    );
    TestValidator.predicate(
      "approved_refund_count should be non-negative",
      snapshot.approved_refund_count >= 0,
    );
    TestValidator.predicate(
      "refunded_amount should be non-negative",
      snapshot.refunded_amount >= 0,
    );
    TestValidator.predicate(
      "chargeback_count should be non-negative",
      snapshot.chargeback_count >= 0,
    );
    TestValidator.predicate(
      "chargeback_amount should be non-negative",
      snapshot.chargeback_amount >= 0,
    );
    TestValidator.predicate(
      "average_order_value should be non-negative",
      snapshot.average_order_value >= 0,
    );
  }

  // 7. Confirm ordering by period_start in descending order.
  for (let i = 1; i < data.length; i++) {
    const prev = new Date(data[i - 1].period_start).getTime();
    const curr = new Date(data[i].period_start).getTime();

    TestValidator.predicate(
      "snapshots should be ordered by period_start in descending order",
      prev >= curr,
    );
  }
}
