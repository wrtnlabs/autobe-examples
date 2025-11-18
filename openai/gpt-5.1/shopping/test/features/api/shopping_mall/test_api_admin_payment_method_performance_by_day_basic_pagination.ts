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
 * Validate basic admin access and structural pagination for daily payment
 * method performance stats.
 *
 * Business context: Administrative users need to inspect payment method
 * performance over time based on the snapshot table
 * `shopping_mall_payment_method_stats`. This endpoint exposes that snapshot as
 * a paginated list of IShoppingMallPaymentMethodPerformanceByDay objects.
 * Before any admin-only statistics can be accessed, an administrator account
 * must exist and be authenticated.
 *
 * This test focuses on the default listing behavior (no explicit filters or
 * pagination parameters) and validates that:
 *
 * - An admin can successfully join and receive authorization.
 * - The statistics endpoint can be called with the authenticated admin context.
 * - The returned page object and its nested pagination metadata are structurally
 *   valid and internally consistent.
 * - Each returned statistics row contains non-negative counters and amounts that
 *   respect simple business invariants.
 *
 * Steps:
 *
 * 1. Register a new admin using POST /auth/admin/join with a random but valid
 *    IShoppingMallAdminJoin.ICreate payload.
 * 2. Assert that the join response matches IShoppingMallAdmin.IAuthorized and that
 *    its token matches IAuthorizationToken. Also, if the nested `admin` summary
 *    is present, assert that it conforms to IShoppingMallAdmin.ISummary.
 * 3. Call GET /shoppingMall/admin/statistics/paymentMethodPerformanceByDay through
 *    api.functional.shoppingMall.admin.statistics.paymentMethodPerformanceByDay.index
 *    using the same connection (which now carries the admin access token via
 *    the SDK).
 * 4. Assert that the response conforms to
 *    IPageIShoppingMallPaymentMethodPerformanceByDay via typia.assert.
 * 5. Extract pagination and verify basic consistency:
 *
 *    - Current, limit, records, and pages are all >= 0.
 *    - When records === 0, data.length === 0.
 *    - When records > 0 and limit > 0, data.length is > 0 and data.length <= limit.
 * 6. For each IShoppingMallPaymentMethodPerformanceByDay row in data:
 *
 *    - Use typia.assert on the item itself to guarantee type correctness.
 *    - Use TestValidator.predicate to assert that payment_attempt_count,
 *         payment_success_count, payment_failure_count, and
 *         payment_expired_count are all non-negative.
 *    - Use TestValidator.predicate to assert that the sum of payment_success_count +
 *         payment_failure_count + payment_expired_count is less than or equal
 *         to payment_attempt_count.
 *    - Use TestValidator.predicate to assert that paid_gmv_amount, refunded_amount,
 *         and chargeback_amount are all
 *
 * > = 0 and not NaN.
 *
 * 7. If there is more than one row, use TestValidator.notEquals with a descriptive
 *    title to ensure that the id of the first and last rows differ, providing a
 *    minimal sanity check that the list is not a trivial duplication of a
 *    single snapshot row.
 */
export async function test_api_admin_payment_method_performance_by_day_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) to obtain authorization and seed the admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);
  if (adminAuthorized.admin !== undefined && adminAuthorized.admin !== null) {
    typia.assert<IShoppingMallAdmin.ISummary>(adminAuthorized.admin);
  }

  // 2. Call payment method performance statistics endpoint with authenticated admin.
  const page: IPageIShoppingMallPaymentMethodPerformanceByDay =
    await api.functional.shoppingMall.admin.statistics.paymentMethodPerformanceByDay.index(
      connection,
    );
  typia.assert<IPageIShoppingMallPaymentMethodPerformanceByDay>(page);

  const { pagination, data } = page;
  typia.assert<IPage.IPagination>(pagination);

  // 3. Basic pagination consistency checks.
  TestValidator.predicate(
    "pagination current page should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when records is zero, data array must be empty",
      data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records > 0, data length should be greater than zero",
      data.length > 0,
    );

    if (pagination.limit > 0) {
      TestValidator.predicate(
        "data length should not exceed pagination limit when limit > 0",
        data.length <= pagination.limit,
      );
    }
  }

  // 4. Per-row structural and business invariants.
  for (const row of data) {
    typia.assert<IShoppingMallPaymentMethodPerformanceByDay>(row);

    TestValidator.predicate(
      "payment_attempt_count should be non-negative",
      row.payment_attempt_count >= 0,
    );
    TestValidator.predicate(
      "payment_success_count should be non-negative",
      row.payment_success_count >= 0,
    );
    TestValidator.predicate(
      "payment_failure_count should be non-negative",
      row.payment_failure_count >= 0,
    );
    TestValidator.predicate(
      "payment_expired_count should be non-negative",
      row.payment_expired_count >= 0,
    );

    const totalOutcomeCount =
      row.payment_success_count +
      row.payment_failure_count +
      row.payment_expired_count;

    TestValidator.predicate(
      "sum of success, failure, and expired counts should not exceed attempt count",
      totalOutcomeCount <= row.payment_attempt_count,
    );

    TestValidator.predicate(
      "paid_gmv_amount should be non-negative and not NaN",
      row.paid_gmv_amount >= 0 && Number.isNaN(row.paid_gmv_amount) === false,
    );
    TestValidator.predicate(
      "refunded_amount should be non-negative and not NaN",
      row.refunded_amount >= 0 && Number.isNaN(row.refunded_amount) === false,
    );
    TestValidator.predicate(
      "chargeback_amount should be non-negative and not NaN",
      row.chargeback_amount >= 0 &&
        Number.isNaN(row.chargeback_amount) === false,
    );
  }

  // 5. Minimal sanity check for duplicated rows when multiple items exist.
  if (data.length > 1) {
    const first = data[0];
    const last = data[data.length - 1];

    TestValidator.notEquals(
      "first and last snapshot ids in page should differ when multiple rows exist",
      first.id,
      last.id,
    );
  }
}
