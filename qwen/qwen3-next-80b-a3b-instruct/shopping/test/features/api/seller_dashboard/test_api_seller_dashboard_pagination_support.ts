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

export async function test_api_seller_dashboard_pagination_support(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authorize seller login with generated credentials
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  // Call seller dashboard endpoint with pagination parameters (page=1, limit=20)
  const dashboardResponse =
    await api.functional.shoppingMall.seller.dashboards.index(sellerConnection);
  typia.assert(dashboardResponse);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination structure",
    dashboardResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    dashboardResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records positive",
    dashboardResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    dashboardResponse.pagination.pages >= 0,
  );
  // Validate data structure and length (exactly 20 records as specified in scenario)
  TestValidator.equals("data array length", dashboardResponse.data.length, 20);
  // Validate each dashboard summary record structure
  for (const summary of dashboardResponse.data) {
    TestValidator.predicate(
      "total_customers non-negative",
      summary.total_customers >= 0,
    );
    TestValidator.predicate(
      "total_sellers non-negative",
      summary.total_sellers >= 0,
    );
    TestValidator.predicate(
      "total_products non-negative",
      summary.total_products >= 0,
    );
    TestValidator.predicate(
      "total_orders non-negative",
      summary.total_orders >= 0,
    );
    TestValidator.predicate(
      "pending_seller_approvals non-negative",
      summary.pending_seller_approvals >= 0,
    );
    TestValidator.predicate(
      "pending_cancellation_requests non-negative",
      summary.pending_cancellation_requests >= 0,
    );
    TestValidator.predicate(
      "pending_refund_requests non-negative",
      summary.pending_refund_requests >= 0,
    );
  }
}
