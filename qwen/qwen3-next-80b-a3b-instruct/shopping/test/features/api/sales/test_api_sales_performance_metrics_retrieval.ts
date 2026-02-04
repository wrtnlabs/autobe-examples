import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_sales_performance_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as customer using authorization utility function
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
      referrer: `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Verify authentication response contains required IAuthorized properties
  typia.assert(customerAuth);
  // Step 2: Use customer-specific connection to retrieve sales metrics
  const salesMetrics: IShoppingMallSaleViewStat =
    await api.functional.shoppingMall.customer.sales.metrics.index(
      customerConnection,
    );
  // Step 3: Validate that response matches the IShoppingMallSaleViewStat schema exactly
  typia.assert(salesMetrics);
}
