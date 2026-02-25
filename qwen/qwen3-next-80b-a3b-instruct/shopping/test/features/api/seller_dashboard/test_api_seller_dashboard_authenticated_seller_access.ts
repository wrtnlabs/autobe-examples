import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_authenticated_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new seller to establish context
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  // 2. Use authenticated seller connection to access dashboard
  const dashboardResponse: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.seller.dashboards.index(sellerConnection);
  typia.assert(dashboardResponse);
  // 3. Extract the seller summary (first and only item)
  const sellerSummary = dashboardResponse.data[0];
  // 4. Validate all fields are present and non-negative integers
  TestValidator.equals(
    "total_products is a number",
    typeof sellerSummary.total_products,
    "number",
  );
  TestValidator.equals(
    "total_orders is a number",
    typeof sellerSummary.total_orders,
    "number",
  );
  TestValidator.equals(
    "total_customers is a number",
    typeof sellerSummary.total_customers,
    "number",
  );
  TestValidator.equals(
    "total_sellers is a number",
    typeof sellerSummary.total_sellers,
    "number",
  );
  TestValidator.equals(
    "pending_seller_approvals is a number",
    typeof sellerSummary.pending_seller_approvals,
    "number",
  );
  TestValidator.equals(
    "pending_cancellation_requests is a number",
    typeof sellerSummary.pending_cancellation_requests,
    "number",
  );
  TestValidator.equals(
    "pending_refund_requests is a number",
    typeof sellerSummary.pending_refund_requests,
    "number",
  );
  // 5. For a newly joined seller, all metrics should be zero
  TestValidator.equals(
    "new seller has 0 total_products",
    sellerSummary.total_products,
    0,
  );
  TestValidator.equals(
    "new seller has 0 total_orders",
    sellerSummary.total_orders,
    0,
  );
  TestValidator.equals(
    "new seller has 0 total_customers (seller-specific dashboard)",
    sellerSummary.total_customers,
    0,
  );
  TestValidator.equals(
    "new seller has 0 total_sellers (seller-specific dashboard)",
    sellerSummary.total_sellers,
    0,
  );
  TestValidator.equals(
    "new seller has 0 pending_seller_approvals (seller-specific dashboard)",
    sellerSummary.pending_seller_approvals,
    0,
  );
  TestValidator.equals(
    "new seller has 0 pending_cancellation_requests",
    sellerSummary.pending_cancellation_requests,
    0,
  );
  TestValidator.equals(
    "new seller has 0 pending_refund_requests",
    sellerSummary.pending_refund_requests,
    0,
  );
  // 6. Validate all values are non-negative
  TestValidator.predicate(
    "total_products is non-negative",
    sellerSummary.total_products >= 0,
  );
  TestValidator.predicate(
    "total_orders is non-negative",
    sellerSummary.total_orders >= 0,
  );
  TestValidator.predicate(
    "total_customers is non-negative",
    sellerSummary.total_customers >= 0,
  );
  TestValidator.predicate(
    "total_sellers is non-negative",
    sellerSummary.total_sellers >= 0,
  );
  TestValidator.predicate(
    "pending_seller_approvals is non-negative",
    sellerSummary.pending_seller_approvals >= 0,
  );
  TestValidator.predicate(
    "pending_cancellation_requests is non-negative",
    sellerSummary.pending_cancellation_requests >= 0,
  );
  TestValidator.predicate(
    "pending_refund_requests is non-negative",
    sellerSummary.pending_refund_requests >= 0,
  );
}
