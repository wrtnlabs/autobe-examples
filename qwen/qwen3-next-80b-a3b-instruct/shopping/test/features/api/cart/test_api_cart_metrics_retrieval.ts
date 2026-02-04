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
export async function test_api_cart_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/referral",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // customerConnection.headers is now updated internally by authorize function
  // Step 2: Create a test cart with multiple items
  const cartItems = ArrayUtil.repeat(3, () => {
    const productId = typia.random<string & tags.Format<"uuid">>();
    return {
      productId,
      variantId: typia.random<string & tags.Format<"uuid">>(),
      quantity: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
      unitPrice: typia.random<number & tags.Minimum<0> & tags.Maximum<10000>>(),
      isAvailable: RandomGenerator.pick([true, false]),
    };
  });
  // Step 3: Validate cart metrics retrieval
  const cartMetrics: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.cart.me.metrics.meMetrics(
      customerConnection,
    );
  typia.assert(cartMetrics);
  // Step 4: Validate cart metrics properties
  TestValidator.predicate(
    "totalAbandonedCarts is non-negative",
    cartMetrics.totalAbandonedCarts >= 0,
  );
  TestValidator.predicate(
    "averageCartValue is non-negative",
    cartMetrics.averageCartValue >= 0,
  );
  TestValidator.predicate(
    "abandonmentRate is between 0 and 1",
    cartMetrics.abandonmentRate >= 0 && cartMetrics.abandonmentRate <= 1,
  );
  TestValidator.predicate(
    "averageTimeToAbandonment is non-negative",
    cartMetrics.averageTimeToAbandonment >= 0,
  );
}
