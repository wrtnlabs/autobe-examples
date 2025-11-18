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

export async function test_api_admin_seller_performance_snapshot_data_sanity(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authorized admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@admin.test.com`,
    password: "Admin#1234",
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Search for a realistic snapshot via index API
  // Use a recent 30‑day window around "now" and modest limit.
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - thirtyDaysMs).toISOString();
  const to = now.toISOString();

  const searchBody = {
    snapshotDateFrom: from,
    snapshotDateTo: to,
    timezone: "Asia/Seoul",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const page: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index(
      connection,
      { body: searchBody },
    );
  typia.assert(page);

  // 2.a Ensure we actually have at least one snapshot to test
  await TestValidator.predicate(
    "seller performance snapshots index should return at least one record",
    async () => page.data.length > 0,
  );

  const summary: IShoppingMallSellerPerformanceSnapshot.ISummary = page.data[0];

  // 3. Fetch detail by snapshotId via GET /shoppingMall/admin/sellerPerformanceSnapshots/{snapshotId}
  const detail: IShoppingMallSellerPerformanceSnapshot =
    await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.at(
      connection,
      {
        snapshotId: summary.id,
      },
    );
  typia.assert(detail);

  // 4. Basic identity consistency checks between summary and detail
  TestValidator.equals(
    "detail id should match summary id",
    detail.id,
    summary.id,
  );

  TestValidator.equals(
    "detail seller.id should match summary seller.id",
    detail.seller.id,
    summary.seller.id,
  );

  // 5. KPI range sanity checks
  const rateFields: Array<{
    title: string;
    value: number;
  }> = [
    {
      title: "order_defect_rate should be within [0,1]",
      value: detail.order_defect_rate,
    },
    {
      title: "refund_rate should be within [0,1]",
      value: detail.refund_rate,
    },
    {
      title: "cancellation_rate should be within [0,1]",
      value: detail.cancellation_rate,
    },
    {
      title: "late_shipment_rate should be within [0,1]",
      value: detail.late_shipment_rate,
    },
    {
      title: "chargeback_rate should be within [0,1]",
      value: detail.chargeback_rate,
    },
  ];

  for (const { title, value } of rateFields) {
    TestValidator.predicate(title, value >= 0 && value <= 1);
  }

  // rating_count and average_rating relationship
  if (detail.rating_count === 0) {
    TestValidator.predicate(
      "when rating_count is 0, average_rating should not be negative",
      detail.average_rating >= 0,
    );
  } else {
    TestValidator.predicate(
      "when rating_count > 0, average_rating should be within [0,5]",
      detail.average_rating >= 0 && detail.average_rating <= 5,
    );
  }

  // dispute_open_count sanity and correlation with tier when extremely high
  TestValidator.predicate(
    "dispute_open_count should be non-negative",
    detail.dispute_open_count >= 0,
  );

  if (detail.dispute_open_count > 1000) {
    TestValidator.predicate(
      "high dispute_open_count should have non-undefined tier classification",
      detail.tier !== undefined,
    );
  }
}
