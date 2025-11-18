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
 * Ensure that payment method performance analytics are available to an
 * authenticated admin and that the response structure matches the paging and
 * analytics DTO contracts.
 *
 * Business context:
 *
 * - This endpoint exposes daily, per-payment-method performance aggregates which
 *   are strictly admin-only analytics data.
 * - In the provided SDK, the only explicit authentication operation we can use is
 *   POST /auth/admin/join, which both creates an admin account and attaches a
 *   JWT token to the provided connection.
 * - We are forbidden from manually manipulating connection headers in the test,
 *   so we cannot reliably simulate unauthenticated or malformed-token
 *   requests.
 *
 * Therefore this test focuses on the positive, authorized-path behavior:
 *
 * 1. Register a new admin using api.functional.auth.admin.join and a random
 *    IShoppingMallAdminJoin.ICreate request body.
 * 2. Assert that the join response is a valid IShoppingMallAdmin.IAuthorized and
 *    that it carries a token structure of type IAuthorizationToken.
 * 3. Immediately call
 *    api.functional.shoppingMall.admin.statistics.paymentMethodPerformanceByDay.index
 *    on the same connection, relying on the SDK to have attached
 *    Authorization.
 * 4. Assert that the response is a valid
 *    IPageIShoppingMallPaymentMethodPerformanceByDay.
 * 5. Perform light business-level validations on the pagination object
 *    (IPage.IPagination):
 *
 *    - Current, limit, pages, and records are all >= 0
 *    - If records === 0 then pages === 0
 *    - If records > 0 then pages >= 1
 * 6. Optionally inspect one analytics row (if present) to ensure field types are
 *    sane via typia.assert on IShoppingMallPaymentMethodPerformanceByDay and
 *    TestValidator.predicate for simple numeric sanity checks (e.g., counts are
 *    non-negative).
 */
export async function test_api_admin_payment_method_performance_by_day_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authenticated admin context on this connection
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 2. Call payment method performance by day analytics as the authenticated admin
  const page: IPageIShoppingMallPaymentMethodPerformanceByDay =
    await api.functional.shoppingMall.admin.statistics.paymentMethodPerformanceByDay.index(
      connection,
    );
  typia.assert<IPageIShoppingMallPaymentMethodPerformanceByDay>(page);

  const pagination = page.pagination;
  // Basic pagination invariants
  TestValidator.predicate(
    "pagination.current must be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be >= 0",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be >= 0",
    pagination.records >= 0,
  );

  // Relationship between records and pages
  if (pagination.records === 0) {
    TestValidator.equals(
      "when records are 0, pages should be 0",
      pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records > 0, pages must be at least 1",
      pagination.pages >= 1,
    );
  }

  // 3. Inspect at most one analytics row, if present, for structural sanity
  if (page.data.length > 0) {
    const row: IShoppingMallPaymentMethodPerformanceByDay = page.data[0];
    typia.assert<IShoppingMallPaymentMethodPerformanceByDay>(row);

    // Counts should be non-negative
    TestValidator.predicate(
      "payment_attempt_count must be >= 0",
      row.payment_attempt_count >= 0,
    );
    TestValidator.predicate(
      "payment_success_count must be >= 0",
      row.payment_success_count >= 0,
    );
    TestValidator.predicate(
      "payment_failure_count must be >= 0",
      row.payment_failure_count >= 0,
    );
    TestValidator.predicate(
      "payment_expired_count must be >= 0",
      row.payment_expired_count >= 0,
    );

    // Monetary fields should be non-negative in typical business scenarios
    TestValidator.predicate(
      "paid_gmv_amount must be >= 0",
      row.paid_gmv_amount >= 0,
    );
    TestValidator.predicate(
      "refunded_amount must be >= 0",
      row.refunded_amount >= 0,
    );
    TestValidator.predicate(
      "chargeback_amount must be >= 0",
      row.chargeback_amount >= 0,
    );
  }
}
