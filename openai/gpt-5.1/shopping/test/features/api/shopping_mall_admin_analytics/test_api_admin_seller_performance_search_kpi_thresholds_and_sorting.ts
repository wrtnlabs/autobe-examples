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
 * Validate KPI-threshold-based filtering and sorting of seller performance
 * snapshots for admin analytics.
 *
 * Business intent:
 *
 * - Ensure that an authenticated admin can query seller performance snapshots
 *   using KPI threshold filters (refund_rate, chargeback_rate,
 *   late_shipment_rate, average_rating, etc.).
 * - Verify that all numeric KPIs in the response respect both the global [0,1]
 *   constraints (where applicable) and the min/max constraints supplied in the
 *   request body.
 * - Validate that sortBy/sortOrder semantics are honored by checking that
 *   snapshots are ordered monotonically by the chosen KPI field.
 * - Confirm that adjusting thresholds or sort direction yields a changed dataset
 *   and/or ordering when there are sufficient records.
 */
export async function test_api_admin_seller_performance_search_kpi_thresholds_and_sorting(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Build first KPI-threshold search request
  const now = new Date();
  const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const firstRequestBody = {
    snapshotDateFrom: fromDate.toISOString(),
    snapshotDateTo: now.toISOString(),
    timezone: "Asia/Seoul",
    minRefundRate: 0.1 satisfies number,
    maxRefundRate: 0.8 satisfies number,
    minChargebackRate: 0.0 satisfies number,
    maxChargebackRate: 0.5 satisfies number,
    minAverageRating: 2.5,
    maxLateShipmentRate: 0.4 satisfies number,
    sortBy: "refund_rate",
    sortOrder: "desc",
    page: 1 satisfies number,
    limit: 20 satisfies number,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const firstPage =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      { body: firstRequestBody },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(firstPage);
  typia.assert<IPage.IPagination>(firstPage.pagination);

  const firstData = firstPage.data;

  // Basic pagination sanity: if there are records, limit should be positive
  if (firstPage.pagination.records > 0) {
    TestValidator.predicate(
      "pagination limit should be positive when records exist",
      firstPage.pagination.limit > 0,
    );
  }

  // 3. Validate KPI ranges and threshold compliance for first call
  for (const snapshot of firstData) {
    typia.assert<IShoppingMallSellerPerformanceSnapshot.ISummary>(snapshot);

    const {
      order_defect_rate,
      refund_rate,
      cancellation_rate,
      late_shipment_rate,
      chargeback_rate,
      average_rating,
    } = snapshot;

    // Global [0,1] constraints for rate fields
    TestValidator.predicate(
      "order_defect_rate must be within [0,1]",
      order_defect_rate >= 0 && order_defect_rate <= 1,
    );
    TestValidator.predicate(
      "refund_rate must be within [0,1]",
      refund_rate >= 0 && refund_rate <= 1,
    );
    TestValidator.predicate(
      "cancellation_rate must be within [0,1]",
      cancellation_rate >= 0 && cancellation_rate <= 1,
    );
    TestValidator.predicate(
      "late_shipment_rate must be within [0,1]",
      late_shipment_rate >= 0 && late_shipment_rate <= 1,
    );
    TestValidator.predicate(
      "chargeback_rate must be within [0,1]",
      chargeback_rate >= 0 && chargeback_rate <= 1,
    );

    // Threshold constraints from firstRequestBody
    if (firstRequestBody.minRefundRate !== undefined) {
      TestValidator.predicate(
        "refund_rate must be >= minRefundRate",
        refund_rate >= firstRequestBody.minRefundRate,
      );
    }
    if (firstRequestBody.maxRefundRate !== undefined) {
      TestValidator.predicate(
        "refund_rate must be <= maxRefundRate",
        refund_rate <= firstRequestBody.maxRefundRate,
      );
    }
    if (firstRequestBody.minChargebackRate !== undefined) {
      TestValidator.predicate(
        "chargeback_rate must be >= minChargebackRate",
        chargeback_rate >= firstRequestBody.minChargebackRate,
      );
    }
    if (firstRequestBody.maxChargebackRate !== undefined) {
      TestValidator.predicate(
        "chargeback_rate must be <= maxChargebackRate",
        chargeback_rate <= firstRequestBody.maxChargebackRate,
      );
    }
    if (firstRequestBody.minAverageRating !== undefined) {
      TestValidator.predicate(
        "average_rating must be >= minAverageRating",
        average_rating >= firstRequestBody.minAverageRating,
      );
    }
    if (firstRequestBody.maxLateShipmentRate !== undefined) {
      TestValidator.predicate(
        "late_shipment_rate must be <= maxLateShipmentRate",
        late_shipment_rate <= firstRequestBody.maxLateShipmentRate,
      );
    }
  }

  // 4. Validate sorting by refund_rate desc if at least two entries
  if (firstData.length >= 2) {
    for (let i = 1; i < firstData.length; i++) {
      const prev = firstData[i - 1].refund_rate;
      const curr = firstData[i].refund_rate;
      TestValidator.predicate(
        "refund_rate should be sorted in descending order",
        prev >= curr,
      );
    }
  }

  // 5. Build second search with different thresholds and sortOrder
  const secondRequestBody = {
    snapshotDateFrom: fromDate.toISOString(),
    snapshotDateTo: now.toISOString(),
    timezone: "Asia/Seoul",
    // Tighten KPI thresholds: higher minRefundRate and minAverageRating,
    // lower maxLateShipmentRate
    minRefundRate: 0.2 satisfies number,
    maxRefundRate: 0.9 satisfies number,
    minChargebackRate: 0.0 satisfies number,
    maxChargebackRate: 0.5 satisfies number,
    minAverageRating: 3.0,
    maxLateShipmentRate: 0.3 satisfies number,
    sortBy: "refund_rate",
    sortOrder: "asc",
    page: 1 satisfies number,
    limit: 20 satisfies number,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const secondPage =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      { body: secondRequestBody },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(
    secondPage,
  );
  typia.assert<IPage.IPagination>(secondPage.pagination);

  const secondData = secondPage.data;

  if (secondPage.pagination.records > 0) {
    TestValidator.predicate(
      "pagination limit should be positive when records exist (second)",
      secondPage.pagination.limit > 0,
    );
  }

  for (const snapshot of secondData) {
    typia.assert<IShoppingMallSellerPerformanceSnapshot.ISummary>(snapshot);

    const {
      order_defect_rate,
      refund_rate,
      cancellation_rate,
      late_shipment_rate,
      chargeback_rate,
      average_rating,
    } = snapshot;

    TestValidator.predicate(
      "order_defect_rate must be within [0,1] (second)",
      order_defect_rate >= 0 && order_defect_rate <= 1,
    );
    TestValidator.predicate(
      "refund_rate must be within [0,1] (second)",
      refund_rate >= 0 && refund_rate <= 1,
    );
    TestValidator.predicate(
      "cancellation_rate must be within [0,1] (second)",
      cancellation_rate >= 0 && cancellation_rate <= 1,
    );
    TestValidator.predicate(
      "late_shipment_rate must be within [0,1] (second)",
      late_shipment_rate >= 0 && late_shipment_rate <= 1,
    );
    TestValidator.predicate(
      "chargeback_rate must be within [0,1] (second)",
      chargeback_rate >= 0 && chargeback_rate <= 1,
    );

    if (secondRequestBody.minRefundRate !== undefined) {
      TestValidator.predicate(
        "refund_rate must be >= minRefundRate (second)",
        refund_rate >= secondRequestBody.minRefundRate,
      );
    }
    if (secondRequestBody.maxRefundRate !== undefined) {
      TestValidator.predicate(
        "refund_rate must be <= maxRefundRate (second)",
        refund_rate <= secondRequestBody.maxRefundRate,
      );
    }
    if (secondRequestBody.minChargebackRate !== undefined) {
      TestValidator.predicate(
        "chargeback_rate must be >= minChargebackRate (second)",
        chargeback_rate >= secondRequestBody.minChargebackRate,
      );
    }
    if (secondRequestBody.maxChargebackRate !== undefined) {
      TestValidator.predicate(
        "chargeback_rate must be <= maxChargebackRate (second)",
        chargeback_rate <= secondRequestBody.maxChargebackRate,
      );
    }
    if (secondRequestBody.minAverageRating !== undefined) {
      TestValidator.predicate(
        "average_rating must be >= minAverageRating (second)",
        average_rating >= secondRequestBody.minAverageRating,
      );
    }
    if (secondRequestBody.maxLateShipmentRate !== undefined) {
      TestValidator.predicate(
        "late_shipment_rate must be <= maxLateShipmentRate (second)",
        late_shipment_rate <= secondRequestBody.maxLateShipmentRate,
      );
    }
  }

  // 6. Validate sorting by refund_rate asc for second call
  if (secondData.length >= 2) {
    for (let i = 1; i < secondData.length; i++) {
      const prev = secondData[i - 1].refund_rate;
      const curr = secondData[i].refund_rate;
      TestValidator.predicate(
        "refund_rate should be sorted in ascending order",
        prev <= curr,
      );
    }
  }

  // 7. Optionally confirm dataset/order difference when both pages are non-empty
  if (firstData.length > 0 && secondData.length > 0) {
    TestValidator.notEquals(
      "KPI threshold and sorting changes should alter dataset and/or order",
      firstData,
      secondData,
    );
  }
}
