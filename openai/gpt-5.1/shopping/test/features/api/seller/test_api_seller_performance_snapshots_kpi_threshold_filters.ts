import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSnapshot";

/**
 * Validate KPI threshold filters (refund_rate and chargeback_rate) in the admin
 * seller performance snapshot search endpoint.
 *
 * ## Business goal
 *
 * Ensure that the PATCH /shoppingMall/admin/sellerPerformanceSnapshots endpoint
 * correctly applies KPI threshold filters such as minRefundRate and
 * maxChargebackRate and that returned snapshots always respect the [0,1] bounds
 * for rate metrics. This supports risk/governance dashboards that focus on
 * elevated refund and chargeback behavior.
 *
 * ## Outline
 *
 * 1. Admin bootstrap via POST /auth/admin/join so that the connection has a valid
 *    admin Authorization header.
 * 2. Define a time window (snapshotDateFrom / snapshotDateTo) covering a recent
 *    period.
 * 3. Choose KPI thresholds, e.g. minRefundRate = 0.3 and maxChargebackRate = 0.5.
 * 4. Call PATCH /shoppingMall/admin/sellerPerformanceSnapshots with an
 *    IShoppingMallSellerPerformanceSnapshot.IRequest body containing the time
 *    window, KPI thresholds, optional timezone, and first-page pagination.
 * 5. Assert that the response matches
 *    IPageIShoppingMallSellerPerformanceSnapshot.ISummary via typia.assert,
 *    then for each data entry verify:
 *
 *    - Refund_rate >= minRefundRate
 *    - Chargeback_rate <= maxChargebackRate
 *    - Order_defect_rate, refund_rate, cancellation_rate, late_shipment_rate,
 *         chargeback_rate all lie within [0,1].
 * 6. Optionally perform a complementary query that uses a very low maxRefundRate
 *    and confirm the boundary behavior (either zero records or all records
 *    satisfy refund_rate <= lowMaxRefundRate).
 */
export async function test_api_seller_performance_snapshots_kpi_threshold_filters(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an admin-authenticated connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Define snapshot date range: recent 30 days window in ISO 8601
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const snapshotDateTo = now.toISOString();
  const snapshotDateFrom = new Date(now.getTime() - thirtyDaysMs).toISOString();

  // 3. KPI thresholds for primary query
  const minRefundRate: number & tags.Minimum<0> & tags.Maximum<1> = 0.3;
  const maxChargebackRate: number & tags.Minimum<0> & tags.Maximum<1> = 0.5;

  // 4. Primary query with KPI thresholds and pagination
  const primaryRequestBody = {
    snapshotDateFrom,
    snapshotDateTo,
    timezone: "Asia/Seoul",
    minRefundRate,
    maxChargebackRate,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const primaryPage: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index(
      connection,
      {
        body: primaryRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(
    primaryPage,
  );

  const primaryData = primaryPage.data;

  // 5. Validate KPI thresholds and [0,1] bounds for all rate fields
  for (const snapshot of primaryData) {
    // All rate fields must be within [0,1] by DTO contract, but we validate
    // business rules explicitly for test clarity.
    TestValidator.predicate(
      "order_defect_rate must be within [0,1]",
      snapshot.order_defect_rate >= 0 && snapshot.order_defect_rate <= 1,
    );
    TestValidator.predicate(
      "refund_rate must be within [0,1]",
      snapshot.refund_rate >= 0 && snapshot.refund_rate <= 1,
    );
    TestValidator.predicate(
      "cancellation_rate must be within [0,1]",
      snapshot.cancellation_rate >= 0 && snapshot.cancellation_rate <= 1,
    );
    TestValidator.predicate(
      "late_shipment_rate must be within [0,1]",
      snapshot.late_shipment_rate >= 0 && snapshot.late_shipment_rate <= 1,
    );
    TestValidator.predicate(
      "chargeback_rate must be within [0,1]",
      snapshot.chargeback_rate >= 0 && snapshot.chargeback_rate <= 1,
    );

    // KPI filter semantics
    TestValidator.predicate(
      "snapshot.refund_rate must be >= minRefundRate filter",
      snapshot.refund_rate >= minRefundRate,
    );
    TestValidator.predicate(
      "snapshot.chargeback_rate must be <= maxChargebackRate filter",
      snapshot.chargeback_rate <= maxChargebackRate,
    );
  }

  // 6. Optional complementary query with a very low maxRefundRate to check
  // boundary conditions. We re-use the same date window but narrow refund
  // tolerance.
  const lowMaxRefundRate: number & tags.Minimum<0> & tags.Maximum<1> = 0.05;

  const complementaryRequestBody = {
    snapshotDateFrom,
    snapshotDateTo,
    timezone: "Asia/Seoul",
    maxRefundRate: lowMaxRefundRate,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const complementaryPage: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index(
      connection,
      {
        body: complementaryRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(
    complementaryPage,
  );

  const complementaryData = complementaryPage.data;

  for (const snapshot of complementaryData) {
    TestValidator.predicate(
      "complementary query: refund_rate must be <= lowMaxRefundRate",
      snapshot.refund_rate <= lowMaxRefundRate,
    );
    TestValidator.predicate(
      "complementary query: refund_rate must be within [0,1]",
      snapshot.refund_rate >= 0 && snapshot.refund_rate <= 1,
    );
  }
}
