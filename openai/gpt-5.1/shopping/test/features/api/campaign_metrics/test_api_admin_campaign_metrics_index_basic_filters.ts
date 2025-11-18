import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCampaignMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCampaignMetric";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCampaignMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignMetric";

/**
 * Validate basic filtered, paginated listing of campaign analytics metrics for
 * admins.
 *
 * Business workflow:
 *
 * 1. Register a fresh admin account via POST /auth/admin/join and obtain an
 *    authorized context.
 *
 *    - This implicitly sets the Authorization header on the shared connection
 *         through the SDK.
 * 2. As the authenticated admin, query PATCH
 *    /shoppingMall/admin/analytics/campaignMetrics with:
 *
 *    - Page = 1
 *    - Limit = 20
 *    - A small list of specific campaign_codes
 *    - A date_from/date_to window around "now"
 *    - Null threshold and sort fields to rely on server defaults
 * 3. Validate that:
 *
 *    - Response structure matches IPageIShoppingMallCampaignMetric.ISummary
 *    - Pagination metadata is consistent with requested page/limit
 *    - Every metric summary item matches IShoppingMallCampaignMetric.ISummary and
 *         campaign_code is one of the requested codes.
 */
export async function test_api_admin_campaign_metrics_index_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin via POST /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare analytics request with basic filters
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const campaignCodes = ["SUMMER_SALE", "WELCOME_COUPON"] as const;

  const requestBody = {
    page: 1,
    limit: 20,
    campaign_codes: [...campaignCodes],
    date_from: threeDaysAgo.toISOString(),
    date_to: now.toISOString(),
    min_gmv_amount: null,
    min_new_customer_order_count: null,
    sort_by: null,
    sort_direction: null,
  } satisfies IShoppingMallCampaignMetric.IRequest;

  const pageResult =
    await api.functional.shoppingMall.admin.analytics.campaignMetrics.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IPageIShoppingMallCampaignMetric.ISummary>(pageResult);

  // 3. Validate pagination metadata
  const pagination = pageResult.pagination;

  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals("pagination limit should be 20", pagination.limit, 20);

  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  const effectiveLimit = requestBody.limit ?? 20;

  // When there are no records, data array must be empty.
  if (pagination.records === 0) {
    TestValidator.equals(
      "no records implies empty data array",
      pageResult.data.length,
      0,
    );
  } else {
    // When records exist, data length should be > 0 and <= limit.
    TestValidator.predicate(
      "records>0 implies non-empty data",
      pageResult.data.length > 0,
    );
    TestValidator.predicate(
      "data length should not exceed limit",
      pageResult.data.length <= effectiveLimit,
    );
  }

  // pages/records consistency: if pages === 0, records must be 0; if pages > 0, records > 0.
  if (pagination.pages === 0) {
    TestValidator.equals(
      "zero pages implies zero records",
      pagination.records,
      0,
    );
  } else {
    TestValidator.predicate(
      "positive pages implies some records",
      pagination.records > 0,
    );
  }

  // 4. Validate each metric summary item
  for (const metric of pageResult.data) {
    typia.assert<IShoppingMallCampaignMetric.ISummary>(metric);

    TestValidator.predicate(
      "metric campaign_code is one of requested codes",
      campaignCodes.some((code) => code === metric.campaign_code),
    );

    TestValidator.predicate(
      "order_count should be non-negative",
      metric.order_count >= 0,
    );
    TestValidator.predicate(
      "paid_order_count should be non-negative",
      metric.paid_order_count >= 0,
    );
    TestValidator.predicate(
      "new_customer_order_count should be non-negative",
      metric.new_customer_order_count >= 0,
    );

    TestValidator.predicate(
      "gmv_amount should be non-negative",
      metric.gmv_amount >= 0,
    );
    TestValidator.predicate(
      "nmv_amount should be non-negative",
      metric.nmv_amount >= 0,
    );
    TestValidator.predicate(
      "discount_total_amount should be non-negative",
      metric.discount_total_amount >= 0,
    );
    TestValidator.predicate(
      "platform_funded_discount_amount should be non-negative",
      metric.platform_funded_discount_amount >= 0,
    );
    TestValidator.predicate(
      "seller_funded_discount_amount should be non-negative",
      metric.seller_funded_discount_amount >= 0,
    );
  }
}
