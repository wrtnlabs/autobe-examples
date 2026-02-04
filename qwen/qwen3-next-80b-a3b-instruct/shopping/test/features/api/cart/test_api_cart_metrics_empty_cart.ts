import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_cart_metrics_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 2: Validate that cart metrics for empty cart returns zero values
  const metrics: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.cart.me.metrics.meMetrics(
      customerConnection,
    );
  typia.assert(metrics);
  // Step 3: Verify all metrics are zero or null for empty cart
  TestValidator.equals(
    "total abandoned carts should be 0",
    metrics.totalAbandonedCarts,
    0,
  );
  TestValidator.equals(
    "average cart value should be 0",
    metrics.averageCartValue,
    0,
  );
  TestValidator.equals(
    "abandonment rate should be 0",
    metrics.abandonmentRate,
    0,
  );
  TestValidator.equals(
    "average time to abandonment should be 0",
    metrics.averageTimeToAbandonment,
    0,
  );
}
