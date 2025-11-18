import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerDailyStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDailyStat";

/**
 * Happy-path test for fetching a seller daily stats snapshot by id as an admin.
 *
 * Business goal:
 *
 * - Ensure that an authenticated admin can retrieve an existing seller daily
 *   statistics snapshot by its UUID primary key using the GET
 *   /shoppingMall/admin/analytics/sellerDailyStats/{sellerDailyStatId}
 *   endpoint.
 * - Validate that the detailed snapshot data is compatible with the summary
 *   representation returned from the list/search endpoint.
 *
 * High-level steps:
 *
 * 1. Join as an admin to get an authorized connection.
 * 2. Use the sellerDailyStats.index search endpoint with a broad
 *    IShoppingMallSellerDailyStat.IRequest filter to obtain at least one
 *    summary record.
 * 3. Pick the first summary and capture its id and key metric fields.
 * 4. Call sellerDailyStats.at with that id to fetch the full
 *    IShoppingMallSellerDailyStat entity.
 * 5. Validate response types with typia.assert.
 * 6. Cross-check KPI fields between summary and detail representations using
 *    TestValidator.equals and predicate utilities.
 */
export async function test_api_admin_seller_daily_stats_get_by_id_happy_path(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // optional ip omitted; backend can derive it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  // token is automatically attached to connection by SDK
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Call sellerDailyStats.index with broad filters to get at least one summary
  const requestBody = {
    // keep filters broad: ask first page with small limit
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerDailyStat.IRequest;

  const pageResult: IPageIShoppingMallSellerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerDailyStat.ISummary>(pageResult);

  // Ensure we have at least one summary row
  await TestValidator.predicate(
    "sellerDailyStats.index should return at least one summary",
    async () => pageResult.data.length > 0,
  );

  const summary: IShoppingMallSellerDailyStat.ISummary = pageResult.data[0];
  typia.assert<IShoppingMallSellerDailyStat.ISummary>(summary);

  // 3. Capture key fields from summary
  const summaryId = summary.id;

  // 4. Call sellerDailyStats.at with the captured id
  const detail: IShoppingMallSellerDailyStat =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.at(
      connection,
      {
        sellerDailyStatId: summaryId,
      },
    );
  typia.assert<IShoppingMallSellerDailyStat>(detail);

  // 5. Cross-check identifiers
  TestValidator.equals(
    "detail.id should match summary.id",
    detail.id,
    summary.id,
  );

  // 6. Cross-check stats_date
  TestValidator.equals(
    "detail.stats_date should match summary.stats_date",
    detail.stats_date,
    summary.stats_date,
  );

  // 7. Cross-check KPI counters
  TestValidator.equals(
    "order_count should be consistent between summary and detail",
    detail.order_count,
    summary.order_count,
  );
  TestValidator.equals(
    "paid_order_count should be consistent between summary and detail",
    detail.paid_order_count,
    summary.paid_order_count,
  );
  TestValidator.equals(
    "cancelled_order_count should be consistent between summary and detail",
    detail.cancelled_order_count,
    summary.cancelled_order_count,
  );
  TestValidator.equals(
    "refunded_order_count should be consistent between summary and detail",
    detail.refunded_order_count,
    summary.refunded_order_count,
  );

  // 8. Cross-check amount fields
  TestValidator.equals(
    "gmv_amount should be consistent between summary and detail",
    detail.gmv_amount,
    summary.gmv_amount,
  );
  TestValidator.equals(
    "nmv_amount should be consistent between summary and detail",
    detail.nmv_amount,
    summary.nmv_amount,
  );
  TestValidator.equals(
    "commission_amount should be consistent between summary and detail",
    detail.commission_amount,
    summary.commission_amount,
  );
  TestValidator.equals(
    "seller_earnings_amount should be consistent between summary and detail",
    detail.seller_earnings_amount,
    summary.seller_earnings_amount,
  );

  // 9. Cross-check additional counters that exist in both representations
  TestValidator.equals(
    "unique_customer_count should be consistent between summary and detail",
    detail.unique_customer_count,
    summary.unique_customer_count,
  );
  TestValidator.equals(
    "shipment_created_count should be consistent between summary and detail",
    detail.shipment_created_count,
    summary.shipment_created_count,
  );
  TestValidator.equals(
    "shipment_delivered_count should be consistent between summary and detail",
    detail.shipment_delivered_count,
    summary.shipment_delivered_count,
  );
  TestValidator.equals(
    "late_shipment_count should be consistent between summary and detail",
    detail.late_shipment_count,
    summary.late_shipment_count,
  );
  TestValidator.equals(
    "dispute_opened_count should be consistent between summary and detail",
    detail.dispute_opened_count,
    summary.dispute_opened_count,
  );
  TestValidator.equals(
    "dispute_lost_count should be consistent between summary and detail",
    detail.dispute_lost_count,
    summary.dispute_lost_count,
  );

  // 10. Rating fields
  TestValidator.equals(
    "average_rating should be consistent between summary and detail",
    detail.average_rating,
    summary.average_rating,
  );
  TestValidator.equals(
    "rating_review_count should be consistent between summary and detail",
    detail.rating_review_count,
    summary.rating_review_count,
  );

  // 11. created_at and updated_at should match and already be validated as date-time by typia
  TestValidator.equals(
    "created_at should be consistent between summary and detail",
    detail.created_at,
    summary.created_at,
  );
  TestValidator.equals(
    "updated_at should be consistent between summary and detail",
    detail.updated_at,
    summary.updated_at,
  );
}
