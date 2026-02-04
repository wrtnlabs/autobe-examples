import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_order_metrics_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 2: Retrieve order metrics as authenticated customer
  const metrics =
    await api.functional.shoppingMall.customer.orders.metrics.index(
      customerConnection,
    );
  typia.assert(metrics);
  // Step 3: Validate that metrics is an object (as per provided IShoppingMallOrderItem = {})
  TestValidator.predicate("metrics is an object", typeof metrics === "object");
  TestValidator.predicate("metrics is not null", metrics !== null);
  TestValidator.predicate("metrics is not undefined", metrics !== undefined);
  // Step 4: Test unauthenticated access
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated access rejected", async () => {
    await api.functional.shoppingMall.customer.orders.metrics.index(
      unauthConnection,
    );
  });
}
