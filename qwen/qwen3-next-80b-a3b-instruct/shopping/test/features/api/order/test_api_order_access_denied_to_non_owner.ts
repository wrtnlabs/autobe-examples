import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_order_access_denied_to_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first customer (owner of the order)
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
  typia.assert(customer1);
  // Step 2: Create order as customer1
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customer1Connection,
      {
        body: {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
          paymentMethodToken: "payment-12345",
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Step 3: Create second customer (attempting unauthorized access)
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
  typia.assert(customer2);
  // Step 4: Attempt to access order1 as customer2 - should fail with 403
  await TestValidator.error(
    "customer2 cannot access customer1's order",
    async () => {
      await api.functional.shoppingMall.customer.orders.at(
        customer2Connection,
        {
          orderId: order.id,
        },
      );
    },
  );
}
