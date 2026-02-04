import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleViewStat";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_sales_metrics_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate seller using utility function
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<12>>(),
    },
  });
  typia.assert(sellerAuth);
  // Use seller-specific connection for API call
  const salesMetrics =
    await api.functional.shoppingMall.seller.analytics.sales.monthly.index(
      sellerConnection,
    );
  // Validate the entire response structure
  typia.assert(salesMetrics);
  // Validate pagination structure matches IPage.IPagination
  const expectedPagination = typia.random<IPage.IPagination>();
  TestValidator.equals(
    "pagination matches schema",
    salesMetrics.pagination,
    expectedPagination,
  );
  // Validate data array structure
  TestValidator.predicate(
    "data array is not empty",
    salesMetrics.data.length > 0,
  );
  // Validate one data item matches IShoppingMallSaleViewStat
  const sampleSale = typia.random<IShoppingMallSaleViewStat>();
  const firstItem = salesMetrics.data[0];
  // Validate all properties match the required schema
  TestValidator.equals("first item matches schema", firstItem, sampleSale);
  // Validate positive values for business metrics
  TestValidator.predicate(
    "totalRevenue is non-negative",
    firstItem.totalRevenue >= 0,
  );
  TestValidator.predicate(
    "transactionCount is non-negative",
    firstItem.transactionCount >= 0,
  );
  TestValidator.predicate(
    "averageTransactionValue is non-negative",
    firstItem.averageTransactionValue >= 0,
  );
  TestValidator.predicate(
    "totalUnitsSold is non-negative",
    firstItem.totalUnitsSold >= 0,
  );
}
