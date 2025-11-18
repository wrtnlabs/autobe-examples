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

export async function test_api_admin_seller_performance_search_invalid_kpi_ranges_handling(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Helper to validate common page invariants
  const assertPageBasics = (
    title: string,
    page: IPageIShoppingMallSellerPerformanceSnapshot.ISummary,
  ): void => {
    typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(page);
    const pagination = page.pagination;
    TestValidator.predicate(
      `${title} - current page is non-negative`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${title} - limit is non-negative`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${title} - records is non-negative`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${title} - pages is non-negative`,
      pagination.pages >= 0,
    );
    TestValidator.equals(
      `${title} - data length does not exceed pagination.limit when limit > 0`,
      page.data.length <= pagination.limit || pagination.limit === 0,
      true,
    );
  };

  // Scenario A: Contradictory refund range (minRefundRate > maxRefundRate)
  const requestA = {
    minRefundRate: 0.9,
    maxRefundRate: 0.1,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const pageA: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      { body: requestA },
    );
  typia.assert(pageA);
  assertPageBasics("scenario A", pageA);

  if (pageA.pagination.records === 0) {
    TestValidator.equals(
      "scenario A - empty records implies empty data array",
      pageA.data.length,
      0,
    );
  } else {
    for (const row of pageA.data) {
      TestValidator.predicate(
        "scenario A - row refund_rate satisfies documented 0..1 bounds",
        row.refund_rate >= 0 && row.refund_rate <= 1,
      );
    }
  }

  // Scenario B: snapshotDateFrom after snapshotDateTo
  const fromDate = new Date();
  const toDate = new Date(fromDate.getTime() - 24 * 60 * 60 * 1000);

  const snapshotDateFromB = fromDate.toISOString();
  const snapshotDateToB = toDate.toISOString();

  const requestB = {
    snapshotDateFrom: snapshotDateFromB,
    snapshotDateTo: snapshotDateToB,
    page: 1,
    limit: 20,
    sortBy: "snapshot_date",
    sortOrder: "desc",
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const pageB: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      { body: requestB },
    );
  typia.assert(pageB);
  assertPageBasics("scenario B", pageB);

  const fromMillis = Date.parse(snapshotDateFromB);
  const toMillis = Date.parse(snapshotDateToB);

  if (pageB.pagination.records === 0) {
    TestValidator.equals(
      "scenario B - empty records implies empty data array",
      pageB.data.length,
      0,
    );
  } else {
    for (const row of pageB.data) {
      const snapshotMillis = Date.parse(row.snapshot_date);
      TestValidator.predicate(
        "scenario B - snapshot_date is within provided [to, from] window regardless of ordering semantics",
        (snapshotMillis >= toMillis && snapshotMillis <= fromMillis) ||
          (snapshotMillis >= fromMillis && snapshotMillis <= toMillis),
      );
    }
  }

  // Scenario C: Unsatisfiable KPI + tier filter (extremely high minAverageRating)
  const minAverageRatingC = 100;

  const requestC = {
    minAverageRating: minAverageRatingC,
    tier: "high_risk",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const pageC: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerPerformance.index(
      connection,
      { body: requestC },
    );
  typia.assert(pageC);
  assertPageBasics("scenario C", pageC);

  TestValidator.equals(
    "scenario C - extremely high minAverageRating with specific tier should yield no records",
    pageC.pagination.records,
    0,
  );
  TestValidator.equals(
    "scenario C - data array should be empty when records is 0",
    pageC.data.length,
    0,
  );
}
