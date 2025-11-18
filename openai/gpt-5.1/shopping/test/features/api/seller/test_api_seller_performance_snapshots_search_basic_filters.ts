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
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSnapshot";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate basic filtered search of seller performance snapshots by admin.
 *
 * Business purpose:
 *
 * - Ensure that an authenticated admin can search seller performance snapshots
 *   with basic filters (sellerId and snapshot date range).
 * - Verify that the response conforms to the paging and summary DTO structures
 *   and that core KPI fields fall within expected numeric ranges.
 *
 * Scenario steps:
 *
 * 1. Register an admin via POST /auth/admin/join; this also authenticates the
 *    connection as admin.
 * 2. Register a seller via POST /auth/seller/join and capture the seller id. This
 *    only prepares an identity; the test does not attempt to create underlying
 *    commerce events because no such APIs are provided here.
 * 3. Build a search request body of type
 *    IShoppingMallSellerPerformanceSnapshot.IRequest, setting:
 *
 *    - SellerId to the registered seller id.
 *    - SnapshotDateFrom and snapshotDateTo to a coherent ISO 8601 range that covers
 *         a recent window.
 *    - Timezone to a realistic IANA timezone ("Asia/Seoul").
 *    - Page and limit to positive ints (page=1, limit=20). All other filters remain
 *         undefined.
 * 4. Call PATCH /shoppingMall/admin/sellerPerformanceSnapshots with the request
 *    body using
 *    api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index.
 * 5. Use typia.assert to validate that the response conforms to
 *    IPageIShoppingMallSellerPerformanceSnapshot.ISummary.
 * 6. Validate basic pagination invariants:
 *
 *    - Current, limit, records, and pages are non-negative.
 *    - If records === 0 then pages === 0.
 *    - If records > 0 then pages >= 1.
 * 7. If the page contains at least one snapshot item, perform detailed checks on
 *    the first item:
 *
 *    - Seller.id equals the seller id used in the filter (when the backend honors
 *         the sellerId constraint).
 *    - Snapshot_date is within the requested [from, to] range.
 *    - Timezone is non-empty.
 *    - KPI rate fields (order_defect_rate, refund_rate, cancellation_rate,
 *         late_shipment_rate, chargeback_rate) are all between 0 and 1
 *         inclusive.
 *    - Average_rating is non-negative.
 *    - Rating_count is non-negative.
 * 8. If the data array is empty, skip item-level assertions but still enforce the
 *    pagination invariants.
 */
export async function test_api_seller_performance_snapshots_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin and authenticate the connection as admin.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a seller and capture its id.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 3. Build a basic search request body with sellerId and date range.
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const fromDate: string & tags.Format<"date-time"> = new Date(
    now.getTime() - thirtyDaysMs,
  ).toISOString() as string & tags.Format<"date-time">;
  const toDate: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;

  const requestBody = {
    sellerId,
    snapshotDateFrom: fromDate,
    snapshotDateTo: toDate,
    timezone: "Asia/Seoul",
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  // 4. Call the sellerPerformanceSnapshots search endpoint as admin.
  const pageResult: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;

  // 6. Validate pagination invariants.
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);

  if (pagination.records === 0) {
    TestValidator.equals("no records implies zero pages", pagination.pages, 0);
  } else {
    TestValidator.predicate(
      "records > 0 implies at least one page",
      pagination.pages >= 1,
    );
  }

  const data = pageResult.data;

  // 7. If there is at least one snapshot, validate core item properties.
  if (data.length > 0) {
    const first = data[0];

    // Seller id should match the filtered sellerId.
    TestValidator.equals(
      "snapshot seller id matches filter sellerId",
      first.seller.id,
      sellerId,
    );

    // snapshot_date within [fromDate, toDate].
    const snapshotDate = new Date(first.snapshot_date).getTime();
    const fromTime = new Date(fromDate).getTime();
    const toTime = new Date(toDate).getTime();
    TestValidator.predicate(
      "snapshot_date is within requested range",
      fromTime <= snapshotDate && snapshotDate <= toTime,
    );

    // timezone is non-empty.
    TestValidator.predicate(
      "snapshot timezone is non-empty",
      first.timezone.length > 0,
    );

    // KPI rate fields are between 0 and 1 inclusive.
    TestValidator.predicate(
      "order_defect_rate in [0,1]",
      first.order_defect_rate >= 0 && first.order_defect_rate <= 1,
    );
    TestValidator.predicate(
      "refund_rate in [0,1]",
      first.refund_rate >= 0 && first.refund_rate <= 1,
    );
    TestValidator.predicate(
      "cancellation_rate in [0,1]",
      first.cancellation_rate >= 0 && first.cancellation_rate <= 1,
    );
    TestValidator.predicate(
      "late_shipment_rate in [0,1]",
      first.late_shipment_rate >= 0 && first.late_shipment_rate <= 1,
    );
    TestValidator.predicate(
      "chargeback_rate in [0,1]",
      first.chargeback_rate >= 0 && first.chargeback_rate <= 1,
    );

    // average_rating is non-negative.
    TestValidator.predicate(
      "average_rating is non-negative",
      first.average_rating >= 0,
    );

    // rating_count is non-negative.
    TestValidator.predicate(
      "rating_count is non-negative",
      first.rating_count >= 0,
    );
  }
}
