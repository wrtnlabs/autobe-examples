import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_performance_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a valid UUID for a seller ID — assuming a seller with this ID exists in test data
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve seller performance metrics using the authenticated admin connection
  const performanceMetrics: IShoppingMallSellerPerformanceMetrics =
    await api.functional.shoppingMall.sellers.performance_metrics.at(
      adminConnection,
      { sellerId },
    );
  typia.assert(performanceMetrics);
  // Step 4: Validate all performance metrics have valid numerical ranges as defined in specification
  // sales_volume must be >= 0
  TestValidator.predicate(
    "sales_volume should be non-negative",
    performanceMetrics.sales_volume >= 0,
  );
  // return_rate must be between 0 and 1 (inclusive)
  TestValidator.predicate(
    "return_rate should be between 0 and 1",
    performanceMetrics.return_rate >= 0 && performanceMetrics.return_rate <= 1,
  );
  // customer_satisfaction_score must be between 0 and 5 (inclusive)
  TestValidator.predicate(
    "customer_satisfaction_score should be between 0 and 5",
    performanceMetrics.customer_satisfaction_score >= 0 &&
      performanceMetrics.customer_satisfaction_score <= 5,
  );
  // response_time_average must be >= 0
  TestValidator.predicate(
    "response_time_average should be non-negative",
    performanceMetrics.response_time_average >= 0,
  );
  // fulfillment_rate must be between 0 and 1 (inclusive)
  TestValidator.predicate(
    "fulfillment_rate should be between 0 and 1",
    performanceMetrics.fulfillment_rate >= 0 &&
      performanceMetrics.fulfillment_rate <= 1,
  );
}
