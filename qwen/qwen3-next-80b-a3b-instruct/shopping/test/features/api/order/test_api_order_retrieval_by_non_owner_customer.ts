import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_retrieval_by_non_owner_customer(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for first customer and register
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customer1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referral",
      },
    });
  // Create connection to use for creating the order (same as customer1)
  const customer1OrderConnection: api.IConnection = { host: connection.host };
  // Authenticate customer1 for making the order
  await authorize_customer_login(customer1OrderConnection, {
    body: {},
  });
  // Create order as customer1
  const createdOrder: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customer1OrderConnection,
      {},
    );
  typia.assert(createdOrder);
  // Create connection for second customer who does NOT own the order
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customer2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/referral",
      },
    });
  // Authenticate customer2
  const customer2AccessConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customer2AccessConnection, {
    body: {},
  });
  // Attempt to retrieve the order created by customer1
  // This should fail with 403 Forbidden because customer2 is not the owner
  await TestValidator.error(
    "customer should be forbidden from retrieving another customer's order",
    async () => {
      await api.functional.shoppingMall.admin.orders.at(
        customer2AccessConnection,
        { orderId: createdOrder.id },
      );
    },
  );
}
