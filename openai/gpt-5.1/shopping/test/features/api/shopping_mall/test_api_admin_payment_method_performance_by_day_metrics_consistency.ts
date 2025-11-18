import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethodPerformanceByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethodPerformanceByDay";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethodPerformanceByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodPerformanceByDay";

/**
 * Validate consistency of daily payment method performance metrics for admin
 * analytics.
 *
 * Business context: This test ensures that the snapshot analytics exposed via
 * GET /shoppingMall/admin/statistics/paymentMethodPerformanceByDay are
 * internally consistent for each payment method and day, and structurally
 * suitable for financial reporting dashboards. It focuses on verifying
 * relationships between aggregated counts, non-negativity of monetary amounts,
 * and uniqueness of (payment_method_code, stats_date) pairs within the returned
 * page.
 *
 * Steps:
 *
 * 1. Join as an admin using POST /auth/admin/join to establish an authenticated
 *    admin context.
 * 2. Call the paymentMethodPerformanceByDay index endpoint to retrieve a page of
 *    IShoppingMallPaymentMethodPerformanceByDay records.
 * 3. For each record, check that:
 *
 *    - Payment_attempt_count is the sum of success, failure, and expired counts.
 *    - All count fields are non-negative.
 *    - Monetary fields (paid_gmv_amount, refunded_amount, chargeback_amount) are
 *         non-negative and finite.
 *    - Monetary fields do not exhibit obvious floating point artifacts (basic string
 *         precision heuristics).
 * 4. Group rows by payment_method_code and stats_date and ensure there is at most
 *    one row per (method, day) pair to approximate independence of daily
 *    snapshots.
 * 5. Validate pagination metadata for basic sanity.
 */
export async function test_api_admin_payment_method_performance_by_day_metrics_consistency(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Fetch payment method performance by day
  const page: IPageIShoppingMallPaymentMethodPerformanceByDay =
    await api.functional.shoppingMall.admin.statistics.paymentMethodPerformanceByDay.index(
      connection,
    );
  typia.assert<IPageIShoppingMallPaymentMethodPerformanceByDay>(page);

  const { pagination, data } = page;

  // 3. Basic pagination sanity checks
  TestValidator.predicate(
    "pagination.current is non-negative",
    () => pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    () => pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    () => pagination.pages >= 0,
  );

  if (pagination.limit > 0) {
    TestValidator.predicate(
      "data.length does not exceed pagination.limit",
      () => data.length <= pagination.limit,
    );
  }

  // Short-circuit for empty datasets: still a valid scenario
  if (data.length === 0) return;

  // Helper to check for obvious floating point artifacts in monetary fields.
  const hasFloatingPointArtifact = (value: number): boolean => {
    if (!Number.isFinite(value)) return true;
    const asString = value.toString();
    const parts = asString.split(".");
    if (parts.length === 1) return false; // integer, fine
    const fractional = parts[1];
    if (fractional.length > 6) return true; // too many decimals for money
    if (fractional.endsWith("0000001") || fractional.endsWith("9999999"))
      return true;
    return false;
  };

  // 4. Row-level consistency and monetary checks
  for (const row of data) {
    typia.assert<IShoppingMallPaymentMethodPerformanceByDay>(row);

    const totalComponents =
      row.payment_success_count +
      row.payment_failure_count +
      row.payment_expired_count;

    TestValidator.predicate(
      "payment counts are non-negative",
      () =>
        row.payment_attempt_count >= 0 &&
        row.payment_success_count >= 0 &&
        row.payment_failure_count >= 0 &&
        row.payment_expired_count >= 0,
    );

    TestValidator.equals(
      "payment_attempt_count equals sum of success, failure, expired",
      row.payment_attempt_count,
      totalComponents,
    );

    TestValidator.predicate(
      "monetary fields are non-negative and finite",
      () =>
        row.paid_gmv_amount >= 0 &&
        row.refunded_amount >= 0 &&
        row.chargeback_amount >= 0 &&
        Number.isFinite(row.paid_gmv_amount) &&
        Number.isFinite(row.refunded_amount) &&
        Number.isFinite(row.chargeback_amount),
    );

    TestValidator.predicate(
      "paid_gmv_amount has acceptable precision",
      () => !hasFloatingPointArtifact(row.paid_gmv_amount),
    );
    TestValidator.predicate(
      "refunded_amount has acceptable precision",
      () => !hasFloatingPointArtifact(row.refunded_amount),
    );
    TestValidator.predicate(
      "chargeback_amount has acceptable precision",
      () => !hasFloatingPointArtifact(row.chargeback_amount),
    );
  }

  // 5. Cross-row independence checks: uniqueness of (payment_method_code, stats_date)
  const seenKeys = new Set<string>();
  for (const row of data) {
    const key = `${row.payment_method_code}__${row.stats_date}`;
    TestValidator.predicate(
      "no duplicate (payment_method_code, stats_date) pairs in page",
      () => !seenKeys.has(key),
    );
    seenKeys.add(key);
  }
}
