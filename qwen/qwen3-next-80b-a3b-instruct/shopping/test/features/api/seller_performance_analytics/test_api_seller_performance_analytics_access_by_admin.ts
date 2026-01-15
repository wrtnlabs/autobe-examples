import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerPerformanceAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceAnalytics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_performance_analytics_access_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join", // Required URI format
    referrer: "https://example.com/admin/signup", // Required URI format
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // adminConnection.headers is now updated with auth token
  // Step 2: Call the seller performance analytics endpoint using the authenticated admin connection
  const sellerPerformanceData: IShoppingMallSellerPerformanceAnalytics =
    await api.functional.shoppingMall.admin.analytics.sellers.performance.index(
      adminConnection,
    );
  // Step 3: Validate the response structure using typia.assert to ensure TypeScript type safety
  typia.assert(sellerPerformanceData);
  // Step 4: Validate key properties with TestValidator using descriptive titles
  TestValidator.predicate(
    "performance score is within range",
    sellerPerformanceData.performance_score >= 0 &&
      sellerPerformanceData.performance_score <= 100,
  );
  TestValidator.predicate(
    "total sales is non-negative",
    sellerPerformanceData.total_sales >= 0,
  );
  TestValidator.predicate(
    "average rating is within 0-5 range",
    sellerPerformanceData.average_rating >= 0 &&
      sellerPerformanceData.average_rating <= 5,
  );
  TestValidator.predicate(
    "order fulfillment rate is between 0 and 1",
    sellerPerformanceData.order_fulfillment_rate >= 0 &&
      sellerPerformanceData.order_fulfillment_rate <= 1,
  );
  TestValidator.predicate(
    "return rate is between 0 and 1",
    sellerPerformanceData.return_rate >= 0 &&
      sellerPerformanceData.return_rate <= 1,
  );
  TestValidator.predicate(
    "customer retention rate is between 0 and 1",
    sellerPerformanceData.customer_retention_rate >= 0 &&
      sellerPerformanceData.customer_retention_rate <= 1,
  );
  TestValidator.predicate(
    "inventory turnover ratio is non-negative",
    sellerPerformanceData.inventory_turnover_ratio >= 0,
  );
  TestValidator.predicate(
    "active listings is non-negative",
    sellerPerformanceData.active_listings >= 0,
  );
  TestValidator.predicate(
    "review count is non-negative",
    sellerPerformanceData.review_count >= 0,
  );
  TestValidator.predicate(
    "last updated is a valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(
      sellerPerformanceData.last_updated,
    ),
  );
}
