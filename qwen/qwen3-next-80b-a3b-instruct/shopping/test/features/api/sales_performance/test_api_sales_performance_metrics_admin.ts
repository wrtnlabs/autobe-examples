import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sales_performance_metrics_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Call the performance metrics endpoint with authenticated admin connection
  const performanceMetrics: IShoppingMallSale =
    await api.functional.shoppingMall.admin.sales.metrics.performance.index(
      adminConnection,
    );
  // Step 3: Validate the response structure using typia.assert for complete type safety
  typia.assert(performanceMetrics);
  // Step 4: Validate that all required fields are present and meet constraints
  TestValidator.predicate(
    "totalSales is non-negative",
    performanceMetrics.totalSales >= 0,
  );
  TestValidator.predicate(
    "averageOrderValue is positive",
    performanceMetrics.averageOrderValue > 0,
  );
  TestValidator.predicate(
    "inventoryTurnoverRate is non-negative",
    performanceMetrics.inventoryTurnoverRate >= 0,
  );
  TestValidator.predicate(
    "conversionRate is between 0 and 1",
    performanceMetrics.conversionRate >= 0 &&
      performanceMetrics.conversionRate <= 1,
  );
  TestValidator.predicate(
    "customerRetentionRate is between 0 and 1",
    performanceMetrics.customerRetentionRate >= 0 &&
      performanceMetrics.customerRetentionRate <= 1,
  );
  // Step 5: Validate that topProducts and bottomProducts are arrays
  TestValidator.predicate(
    "topProducts is an array",
    Array.isArray(performanceMetrics.topProducts),
  );
  TestValidator.predicate(
    "bottomProducts is an array",
    Array.isArray(performanceMetrics.bottomProducts),
  );
  // Step 6: Validate that topProducts and bottomProducts contain at least 10 items each
  TestValidator.predicate(
    "topProducts has at least 10 items",
    performanceMetrics.topProducts.length >= 10,
  );
  TestValidator.predicate(
    "bottomProducts has at least 10 items",
    performanceMetrics.bottomProducts.length >= 10,
  );
  // Step 7: Note: Do NOT validate specific values of topProducts/bottomProducts since
  // they are determined by real data in the backend and cannot be predicted in tests
  // The schema defines IShoppingMallProduct as {} (empty object), so just verify array structure
}
