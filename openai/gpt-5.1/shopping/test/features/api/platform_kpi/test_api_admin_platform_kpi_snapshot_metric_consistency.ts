import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformKpiSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpiSnapshot";

export async function test_api_admin_platform_kpi_snapshot_metric_consistency(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authorized context.
  //    Use typia.random to generate a valid IShoppingMallAdminJoin.ICreate body.
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Build a narrow KPI search request for recent daily snapshots.
  //    We use a short period window around “now” and a small limit.
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const periodEndTo = now.toISOString();
  const periodEndFrom = new Date(now.getTime() - oneDayMs * 30).toISOString();

  const baseRequest = {
    periodTypes: ["day"],
    periodEndFrom,
    periodEndTo,
    page: 1,
    limit: 5,
    orderBy: "period_end",
    orderDirection: "desc",
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  const firstPage: IPageIShoppingMallPlatformKpiSnapshot =
    await api.functional.shoppingMall.admin.analytics.platformKpis.index(
      connection,
      { body: baseRequest },
    );
  typia.assert<IPageIShoppingMallPlatformKpiSnapshot>(firstPage);

  const snapshots1: IShoppingMallPlatformKpiSnapshot[] = firstPage.data;

  // Sanity: pagination should be internally consistent.
  const pagination1: IPage.IPagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(pagination1);
  TestValidator.predicate(
    "first page pagination has non-negative counts",
    pagination1.current >= 0 &&
      pagination1.limit >= 0 &&
      pagination1.records >= 0 &&
      pagination1.pages >= 0,
  );

  // 3. Per-snapshot business consistency checks.
  for (const snapshot of snapshots1) {
    typia.assert<IShoppingMallPlatformKpiSnapshot>(snapshot);

    // 3-1. Basic non-negativity for monetary metrics and take rate.
    TestValidator.predicate(
      "gmv, nmv, platform revenue, refunded, chargeback, AOV, take_rate must be non-negative",
      snapshot.gmv_amount >= 0 &&
        snapshot.nmv_amount >= 0 &&
        snapshot.platform_revenue_amount >= 0 &&
        snapshot.refunded_amount >= 0 &&
        snapshot.chargeback_amount >= 0 &&
        snapshot.average_order_value >= 0 &&
        snapshot.take_rate >= 0,
    );

    // 3-2. Logical relationship between order_count and paid_order_count.
    if (snapshot.order_count > 0 && snapshot.paid_order_count > 0) {
      TestValidator.predicate(
        "paid_order_count cannot exceed order_count",
        snapshot.paid_order_count <= snapshot.order_count,
      );
    }

    // 3-3. AOV should roughly equal GMV / paid_order_count when both positive.
    if (snapshot.gmv_amount > 0 && snapshot.paid_order_count > 0) {
      const theoreticalAov = snapshot.gmv_amount / snapshot.paid_order_count;
      const lowerBound = theoreticalAov * 0.5;
      const upperBound = theoreticalAov * 1.5;
      TestValidator.predicate(
        "average_order_value should be within a reasonable range around GMV / paid_order_count",
        snapshot.average_order_value >= 0 &&
          snapshot.average_order_value >= lowerBound &&
          snapshot.average_order_value <= upperBound,
      );
    }

    // 3-4. Take rate sanity when revenue and GMV are positive.
    if (snapshot.platform_revenue_amount > 0 && snapshot.gmv_amount > 0) {
      const impliedTakeRate =
        snapshot.platform_revenue_amount / snapshot.gmv_amount;
      TestValidator.predicate(
        "take_rate should be between 0 and 1 when revenue and GMV are positive",
        snapshot.take_rate >= 0 &&
          snapshot.take_rate <= 1 + 1e-6 &&
          impliedTakeRate >= 0 &&
          impliedTakeRate <= 1 + 1e-6,
      );
    }

    // 3-5. Refund counts: approved_refund_count <= refund_request_count.
    TestValidator.predicate(
      "approved_refund_count cannot exceed refund_request_count",
      snapshot.approved_refund_count <= snapshot.refund_request_count,
    );

    // 3-6. Temporal consistency: created_at / updated_at should be
    //       later than or equal to period_end.
    const periodEnd = new Date(snapshot.period_end).getTime();
    const createdAt = new Date(snapshot.created_at).getTime();
    const updatedAt = new Date(snapshot.updated_at).getTime();

    TestValidator.predicate(
      "snapshot created_at should be at or after period_end",
      createdAt >= periodEnd,
    );
    TestValidator.predicate(
      "snapshot updated_at should be at or after period_end",
      updatedAt >= periodEnd,
    );
  }

  // 4. Optional temporal variance check: query another adjacent time
  //    window and ensure that if both windows have data, they are not
  //    identical clones.
  const shiftedFrom = new Date(now.getTime() - oneDayMs * 60).toISOString();
  const shiftedTo = new Date(now.getTime() - oneDayMs * 30 - 1).toISOString();

  const secondRequest = {
    ...baseRequest,
    periodEndFrom: shiftedFrom,
    periodEndTo: shiftedTo,
  } satisfies IShoppingMallPlatformKpiSnapshot.IRequest;

  const secondPage: IPageIShoppingMallPlatformKpiSnapshot =
    await api.functional.shoppingMall.admin.analytics.platformKpis.index(
      connection,
      { body: secondRequest },
    );
  typia.assert<IPageIShoppingMallPlatformKpiSnapshot>(secondPage);

  const snapshots2: IShoppingMallPlatformKpiSnapshot[] = secondPage.data;

  if (snapshots1.length > 0 && snapshots2.length > 0) {
    const ids1 = snapshots1.map((s) => s.id).sort();
    const ids2 = snapshots2.map((s) => s.id).sort();

    const allEqualLength = ids1.length === ids2.length;
    const allEqualIds =
      allEqualLength && ids1.every((id, idx) => id === ids2[idx]);

    TestValidator.predicate(
      "KPI snapshots for adjacent windows should not be identical clones when both have data",
      allEqualIds === false,
    );
  }
}
