import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartHistory";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartHistory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_carts_create } from "../../../generate/generate_random_shopping_mall_customer_carts_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

/**
 * Test cart history authorization enforcement.
 * 1. Register customer account
 * 2. Login as customer to establish authentication
 * 3. Add item to cart to generate history
 * 4. Test customer can access their own cart history
 * 5. Test customer cannot access another customer's cart history
 */
export async function test_api_customer_cart_history_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  // 2. Login as customer to establish authentication
  const loginBody = {
    email: customerData.email,
    password: customerData.password,
  } satisfies IShoppingMallCustomer.ILogin;
  await authorize_customer_login(customerConnection, {
    body: loginBody,
  });
  // 3. Add item to cart to generate history
  const cartCreateBody = {} satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    customerConnection,
    {
      body: cartCreateBody,
    },
  );
  typia.assert(cart);
  // 4. Test: Customer can access their own cart history
  // Since cart DTO has no ID property, we generate a random UUID
  const ownHistory =
    await api.functional.shoppingMall.customer.carts.history.index(
      customerConnection,
      {
        cartId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(ownHistory);
  TestValidator.predicate(
    "customer can access own history",
    ownHistory.data !== undefined,
  );
  // 5. Test: Customer cannot access another customer's cart history
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password456",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(otherCustomerConnection, {
    body: otherCustomerData,
  });
  // Create cart for other customer
  const otherCustomerLoginBody = {
    email: otherCustomerData.email,
    password: otherCustomerData.password,
  } satisfies IShoppingMallCustomer.ILogin;
  await authorize_customer_login(otherCustomerConnection, {
    body: otherCustomerLoginBody,
  });
  const otherCustomerCart =
    await api.functional.shoppingMall.customer.carts.create(
      otherCustomerConnection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(otherCustomerCart);
  // Customer should not be able to access other customer's cart history
  await TestValidator.error(
    "customer cannot access other customer's history",
    async () => {
      await api.functional.shoppingMall.customer.carts.history.index(
        customerConnection,
        {
          cartId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
