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
 * Validate admin can retrieve daily payment method performance snapshots and
 * that the analytics page response is structurally consistent.
 *
 * This test adapts the original filtering/sorting scenario to the actually
 * available SDK surface: the statistics endpoint does not accept any query
 * parameters, and there are no public APIs to seed or manipulate
 * `shopping_mall_payment_method_stats` rows directly. As a result, we focus on
 * a realistic end-to-end flow that is implementation-safe:
 *
 * 1. Register an admin via POST /auth/admin/join using
 *    api.functional.auth.admin.join. This both creates the admin account and
 *    configures the Authorization header on the shared connection, so
 *    subsequent requests run under admin credentials.
 * 2. Call GET /shoppingMall/admin/statistics/paymentMethodPerformanceByDay through
 *    api.functional.shoppingMall.admin.statistics
 *    .paymentMethodPerformanceByDay.index(connection), which returns a page of
 *    IShoppingMallPaymentMethodPerformanceByDay rows wrapped in
 *    IPageIShoppingMallPaymentMethodPerformanceByDay.
 * 3. Use typia.assert to fully validate the response shape and types, then perform
 *    light business sanity checks that do not depend on unexposed filters or
 *    sort parameters:
 *
 *    - Pagination.current, pagination.limit, pagination.records, pagination.pages
 *         are non-negative and consistent with data length.
 *    - When multiple rows are present, their stats_date values form a deterministic
 *         order if the backend is already applying a sort; the test checks that
 *         either the array is non-decreasing or non-increasing by stats_date.
 *    - Basic invariants on per-row metrics, such as each of the payment_*_count
 *         fields being >= 0 and paid_gmv_amount, refunded_amount, and
 *         chargeback_amount being >= 0.
 *
 * Because we cannot control or seed analytics snapshots from the test harness,
 * we do not assert specific payment_method_code values or exact row counts.
 * Instead, we validate structure and general monotonic consistency that should
 * hold regardless of the concrete data loaded from the snapshot tables.
 */
export async function test_api_admin_payment_method_performance_by_day_filtering_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join to acquire Authorization token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Fetch payment method performance by day page
  const page =
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

  // records should be at least the number of elements returned on this page
  TestValidator.predicate(
    "pagination.records >= data.length",
    () => pagination.records >= data.length,
  );

  // 4. Per-row invariants and basic metric sanity
  for (const row of data) {
    typia.assert<IShoppingMallPaymentMethodPerformanceByDay>(row);

    TestValidator.predicate(
      "payment_attempt_count is non-negative",
      () => row.payment_attempt_count >= 0,
    );
    TestValidator.predicate(
      "payment_success_count is non-negative",
      () => row.payment_success_count >= 0,
    );
    TestValidator.predicate(
      "payment_failure_count is non-negative",
      () => row.payment_failure_count >= 0,
    );
    TestValidator.predicate(
      "payment_expired_count is non-negative",
      () => row.payment_expired_count >= 0,
    );
    TestValidator.predicate(
      "paid_gmv_amount is non-negative",
      () => row.paid_gmv_amount >= 0,
    );
    TestValidator.predicate(
      "refunded_amount is non-negative",
      () => row.refunded_amount >= 0,
    );
    TestValidator.predicate(
      "chargeback_amount is non-negative",
      () => row.chargeback_amount >= 0,
    );
  }

  // 5. If multiple rows exist, check that stats_date ordering is
  // at least monotonic in one direction (non-decreasing or
  // non-increasing). This does not enforce a specific sort order
  // but ensures deterministic ordering.
  if (data.length >= 2) {
    const timestamps = data.map((row) => new Date(row.stats_date).getTime());

    const nonDecreasing = timestamps.every((t, index, arr) =>
      index === 0 ? true : arr[index - 1] <= t,
    );
    const nonIncreasing = timestamps.every((t, index, arr) =>
      index === 0 ? true : arr[index - 1] >= t,
    );

    TestValidator.predicate(
      "stats_date ordering is monotonic (non-decreasing or non-increasing)",
      () => nonDecreasing || nonIncreasing,
    );
  }
}
