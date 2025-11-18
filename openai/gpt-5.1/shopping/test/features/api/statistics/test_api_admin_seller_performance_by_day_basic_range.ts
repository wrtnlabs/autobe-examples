import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceByDayStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceByDayStatistics";
import type { IShoppingMallSellerPerformanceByDayStatisticsSellerFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceByDayStatisticsSellerFilter";

/**
 * Validate basic daily seller performance statistics retrieval capabilities for
 * an admin over a simple recent date range.
 *
 * Business context:
 *
 * - An internal shopping-mall administrator uses analytics dashboards to inspect
 *   daily seller performance (orders, GMV, refunds, etc.).
 * - Authorization is established via the admin join flow, which returns an
 *   IShoppingMallAdmin.IAuthorized payload and sets the Authorization header on
 *   the shared connection.
 * - The actual statistics endpoint GET
 *   /shoppingMall/admin/statistics/sellerPerformanceByDay is not available as
 *   an SDK function in the current test harness, so this E2E test focuses on
 *   validating the structural and aggregation invariants of the
 *   IShoppingMallSellerPerformanceByDayStatistics DTO using realistic
 *   randomized data.
 *
 * Test steps:
 *
 * 1. Admin registration and authentication
 *
 *    - Generate a random but valid admin join payload
 *         (IShoppingMallAdminJoin.ICreate) using typia.random, ensuring
 *         email/password/URLs respect their formats.
 *    - Call api.functional.auth.admin.join(connection, { body }) and assert the
 *         returned IShoppingMallAdmin.IAuthorized using typia.assert.
 *    - This also ensures the Authorization header is populated on the connection for
 *         any subsequent admin-only calls (even though we do not have the
 *         actual statistics SDK method here).
 * 2. Construct a synthetic statistics result
 *
 *    - Use typia.random<IShoppingMallSellerPerformanceByDayStatistics>() to obtain a
 *         structurally valid statistics object.
 *    - Normalize the startDate/endDate to represent a recent 7-day window:
 *
 *         - If startDate or endDate are missing, synthesize them from today and six days
 *                   ago in the Asia/Seoul timezone by generating ISO date
 *                   strings (YYYY-MM-DD) and assigning them back to the
 *                   object.
 *         - Ensure startDate <= endDate by swapping if necessary.
 *    - Ensure that all row.date values fall inside [startDate, endDate] by clamping
 *         each date into the range while preserving ordering intent.
 * 3. Validate structural invariants
 *
 *    - Call typia.assert<IShoppingMallSellerPerformanceByDayStatistics>(stats) to
 *         guarantee type correctness.
 *    - Assert that rows are sorted by date ascending:
 *
 *         - Iterate through rows and use TestValidator.predicate to ensure each row.date
 *                   >= previous row.date.
 *    - For each row, when seller is present, call typia.assert on
 *         IShoppingMallSeller.ISummary, then perform a simple non-emptiness
 *         check on seller.email to ensure it looks populated.
 * 4. Validate range coverage
 *
 *    - For non-empty rows, assert via TestValidator.predicate that every row.date is
 *         within [startDate, endDate] inclusive.
 * 5. Validate summary aggregation (when present)
 *
 *    - If stats.summary is defined:
 *
 *         - Compute aggregates from rows:
 *
 *                           - Distinct sellerId count => expectedTotalSellers
 *                           - Distinct date count => expectedTotalDays
 *                           - Sums: totalOrders, totalOrderItems, totalGrossMerchandiseValue,
 *                                               totalNetEarnings,
 *                                               totalCommissionAmount,
 *                                               totalRefundAmount.
 *         - Use TestValidator.equals to compare summary.totalSellers and
 *                   summary.totalDays against the distinct counts.
 *         - Use TestValidator.equals to compare the integer aggregates and floating-point
 *                   aggregates. For floating-point fields, use a small
 *                   tolerance when comparing by computing absolute differences
 *                   and checking they are below an epsilon with
 *                   TestValidator.predicate.
 *         - When summary.averageOrderValue is present and totalOrders > 0, validate that
 *                   it is non-negative and does not exceed
 *                   totalGrossMerchandiseValue by more than epsilon.
 *         - When summary.averageRefundRate is present, validate that it is non-negative
 *                   (avoiding assumptions about exact scaling).
 * 6. No HTTP error or type-error scenarios
 *
 *    - The test deliberately avoids type mismatch scenarios, missing required
 *         fields, or explicit HTTP status code inspection.
 *    - It instead focuses on deterministically validating DTO-level invariants for
 *         an analytics response that would be returned by the seller
 *         performance by day endpoint.
 */
export async function test_api_admin_seller_performance_by_day_basic_range(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Construct a synthetic statistics result
  let stats: IShoppingMallSellerPerformanceByDayStatistics =
    typia.random<IShoppingMallSellerPerformanceByDayStatistics>();
  typia.assert<IShoppingMallSellerPerformanceByDayStatistics>(stats);

  // Normalize date range to a recent 7-day window if needed
  const today = new Date();
  const startDateObj = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

  let startDate: string | undefined = stats.startDate ?? isoDate(startDateObj);
  let endDate: string | undefined = stats.endDate ?? isoDate(today);

  if (startDate > endDate) {
    const tmp = startDate;
    startDate = endDate;
    endDate = tmp;
  }

  stats = {
    ...stats,
    startDate,
    endDate,
  };

  // Clamp row dates into [startDate, endDate] when both are present
  if (startDate !== undefined && endDate !== undefined) {
    const clampDate = (date: string): string => {
      if (date < startDate!) return startDate!;
      if (date > endDate!) return endDate!;
      return date;
    };
    stats = {
      ...stats,
      rows: stats.rows.map((row) => ({
        ...row,
        date: clampDate(row.date),
      })),
    };
  }

  // Re-assert after normalization
  typia.assert<IShoppingMallSellerPerformanceByDayStatistics>(stats);

  const effectiveStart = stats.startDate;
  const effectiveEnd = stats.endDate;

  // 3. Validate structural invariants: rows ordered by date ascending
  let previousDate: string | null = null;
  for (const row of stats.rows) {
    if (previousDate !== null) {
      TestValidator.predicate(
        "rows are ordered by date ascending",
        row.date >= previousDate,
      );
    }
    previousDate = row.date;

    // Validate seller summary when present
    if (row.seller !== undefined) {
      const sellerSummary: IShoppingMallSeller.ISummary = row.seller;
      typia.assert<IShoppingMallSeller.ISummary>(sellerSummary);
      TestValidator.predicate(
        "seller email is non-empty",
        sellerSummary.email.length > 0,
      );
    }
  }

  // 4. Validate range coverage for non-empty rows
  if (
    stats.rows.length > 0 &&
    effectiveStart !== undefined &&
    effectiveEnd !== undefined
  ) {
    for (const row of stats.rows) {
      TestValidator.predicate(
        "row date is within [startDate, endDate]",
        row.date >= effectiveStart && row.date <= effectiveEnd,
      );
    }
  }

  // 5. Validate summary aggregation when present
  if (stats.summary !== undefined) {
    const summary = stats.summary;

    // Aggregate from rows
    const distinctSellerIds = new Set<string>();
    const distinctDates = new Set<string>();

    let aggTotalOrders = 0;
    let aggTotalOrderItems = 0;
    let aggGMV = 0;
    let aggNetEarnings = 0;
    let aggCommission = 0;
    let aggRefundAmount = 0;

    for (const row of stats.rows) {
      distinctSellerIds.add(row.sellerId);
      distinctDates.add(row.date);

      aggTotalOrders += row.totalOrders;
      aggTotalOrderItems += row.totalOrderItems;
      aggGMV += row.grossMerchandiseValue;
      aggNetEarnings += row.netEarnings;
      aggCommission += row.commissionAmount;
      aggRefundAmount += row.refundAmount;
    }

    const expectedTotalSellers = distinctSellerIds.size;
    const expectedTotalDays = distinctDates.size;

    TestValidator.equals(
      "summary.totalSellers matches distinct sellerIds",
      summary.totalSellers,
      expectedTotalSellers,
    );
    TestValidator.equals(
      "summary.totalDays matches distinct dates",
      summary.totalDays,
      expectedTotalDays,
    );

    TestValidator.equals(
      "summary.totalOrders matches sum of row.totalOrders",
      summary.totalOrders,
      aggTotalOrders,
    );
    TestValidator.equals(
      "summary.totalOrderItems matches sum of row.totalOrderItems",
      summary.totalOrderItems,
      aggTotalOrderItems,
    );

    const epsilon = 1e-6;

    TestValidator.predicate(
      "summary.totalGrossMerchandiseValue close to sum of row.grossMerchandiseValue",
      Math.abs(summary.totalGrossMerchandiseValue - aggGMV) <= epsilon,
    );
    TestValidator.predicate(
      "summary.totalNetEarnings close to sum of row.netEarnings",
      Math.abs(summary.totalNetEarnings - aggNetEarnings) <= epsilon,
    );
    TestValidator.predicate(
      "summary.totalCommissionAmount close to sum of row.commissionAmount",
      Math.abs(summary.totalCommissionAmount - aggCommission) <= epsilon,
    );
    TestValidator.predicate(
      "summary.totalRefundAmount close to sum of row.refundAmount",
      Math.abs(summary.totalRefundAmount - aggRefundAmount) <= epsilon,
    );

    if (summary.averageOrderValue !== undefined && summary.totalOrders > 0) {
      TestValidator.predicate(
        "summary.averageOrderValue is non-negative",
        summary.averageOrderValue >= 0,
      );
      TestValidator.predicate(
        "summary.averageOrderValue does not exceed GMV too much",
        summary.averageOrderValue <=
          summary.totalGrossMerchandiseValue + epsilon,
      );
    }

    if (summary.averageRefundRate !== undefined) {
      TestValidator.predicate(
        "summary.averageRefundRate is non-negative",
        summary.averageRefundRate >= 0,
      );
    }
  }
}
