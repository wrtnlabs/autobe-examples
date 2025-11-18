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
 * Validate empty and edge-case behavior of daily payment method performance
 * statistics.
 *
 * Business intent:
 *
 * - Ensure an administrator can join and immediately access the snapshot-based
 *   payment method performance-by-day analytics endpoint.
 * - Verify that the statistics endpoint behaves robustly when there may be no
 *   underlying snapshot rows, returning a structurally valid empty page instead
 *   of errors.
 * - Exercise the endpoint repeatedly to approximate a high-volume usage pattern
 *   and confirm it remains stable.
 * - Perform sanity checks on returned monetary and counter fields when data is
 *   present, without assuming any particular dataset size.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join. Rely on the SDK to attach the
 *    authorization token to the connection.
 * 2. Call GET /shoppingMall/admin/statistics/paymentMethodPerformanceByDay once
 *    and validate pagination invariants and empty-data behavior.
 * 3. If the response contains data, inspect one record to verify core field
 *    integrity and numeric sanity.
 * 4. Perform multiple sequential calls to the same endpoint using
 *    ArrayUtil.asyncRepeat, validating each response to approximate high-volume
 *    access.
 */
export async function test_api_admin_payment_method_performance_by_day_empty_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication setup
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Single-call validation for empty or non-empty dataset
  const firstPage: IPageIShoppingMallPaymentMethodPerformanceByDay =
    await api.functional.shoppingMall.admin.statistics.paymentMethodPerformanceByDay.index(
      connection,
    );
  typia.assert<IPageIShoppingMallPaymentMethodPerformanceByDay>(firstPage);

  const pagination = firstPage.pagination;
  const data = firstPage.data;

  TestValidator.predicate(
    "pagination.current must be non-negative",
    () => pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be non-negative",
    () => pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative",
    () => pagination.pages >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when records is 0, data must be an empty array",
      data.length,
      0,
    );
  }

  if (data.length > 0) {
    const sample: IShoppingMallPaymentMethodPerformanceByDay = data[0];
    typia.assert<IShoppingMallPaymentMethodPerformanceByDay>(sample);

    TestValidator.predicate(
      "sample.id should be non-empty",
      () => sample.id.length > 0,
    );
    TestValidator.predicate(
      "sample.payment_method_code should be non-empty",
      () => sample.payment_method_code.length > 0,
    );
    TestValidator.predicate(
      "sample.payment_attempt_count should be non-negative",
      () => sample.payment_attempt_count >= 0,
    );
    TestValidator.predicate(
      "sample.payment_success_count should be non-negative",
      () => sample.payment_success_count >= 0,
    );
    TestValidator.predicate(
      "sample.payment_failure_count should be non-negative",
      () => sample.payment_failure_count >= 0,
    );
    TestValidator.predicate(
      "sample.payment_expired_count should be non-negative",
      () => sample.payment_expired_count >= 0,
    );

    const sumAmounts =
      sample.paid_gmv_amount +
      sample.refunded_amount +
      sample.chargeback_amount;
    TestValidator.predicate("combined monetary fields should be finite", () =>
      Number.isFinite(sumAmounts),
    );

    const adjustedPaid = sample.paid_gmv_amount + 1;
    const adjustedRefunded = sample.refunded_amount + 1;
    const adjustedChargeback = sample.chargeback_amount + 1;
    TestValidator.predicate(
      "adjusted paid_gmv_amount should remain finite",
      () => Number.isFinite(adjustedPaid),
    );
    TestValidator.predicate(
      "adjusted refunded_amount should remain finite",
      () => Number.isFinite(adjustedRefunded),
    );
    TestValidator.predicate(
      "adjusted chargeback_amount should remain finite",
      () => Number.isFinite(adjustedChargeback),
    );
  }

  // 3. Repeated calls to approximate high-volume usage
  const repeatCount = 5;
  const pages: IPageIShoppingMallPaymentMethodPerformanceByDay[] =
    await ArrayUtil.asyncRepeat(repeatCount, async () => {
      const page =
        await api.functional.shoppingMall.admin.statistics.paymentMethodPerformanceByDay.index(
          connection,
        );
      typia.assert<IPageIShoppingMallPaymentMethodPerformanceByDay>(page);
      return page;
    });

  for (const [index, page] of pages.entries()) {
    const p = page.pagination;
    const items = page.data;

    TestValidator.predicate(
      `page ${index}: records must be non-negative`,
      () => p.records >= 0,
    );
    TestValidator.predicate(
      `page ${index}: current must be non-negative`,
      () => p.current >= 0,
    );
    TestValidator.predicate(
      `page ${index}: pages must be non-negative`,
      () => p.pages >= 0,
    );

    if (p.limit > 0) {
      TestValidator.predicate(
        `page ${index}: data.length must not exceed limit when limit > 0`,
        () => items.length <= p.limit,
      );
    }

    if (items.length > 0) {
      const row = items[0];
      typia.assert<IShoppingMallPaymentMethodPerformanceByDay>(row);
    }
  }
}
