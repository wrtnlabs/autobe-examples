import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";

export async function test_api_customer_order_item_erase_success_and_authorization_checks(
  connection: api.IConnection,
): Promise<void> {
  /*
    Scenario description:
    1. Successful deletion of an existing order item by authenticated customer.
    2. Attempt to delete a non-existent order item.
    3. Unauthorized deletion attempt by different customer.
    */
  // 1. Successful deletion by authenticated customer
  // Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customerAuthorized.token.access;
  // Create an order item for the registered customer
  const createdOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(createdOrderItem);
  // Delete the created order item
  await api.functional.shoppingMall.customer.order_items.erase(
    customerConnection,
    {
      orderItemId: createdOrderItem.id,
    },
  );
  // Confirm deletion by attempting to delete again to check error
  await TestValidator.error("delete already deleted order item", async () => {
    await api.functional.shoppingMall.customer.order_items.erase(
      customerConnection,
      {
        orderItemId: createdOrderItem.id,
      },
    );
  });
  // 2. Attempt to delete a non-existent order item
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherAuthorized = await authorize_customer_join(
    anotherCustomerConnection,
    {},
  );
  anotherCustomerConnection.headers ??= {};
  anotherCustomerConnection.headers.Authorization =
    anotherAuthorized.token.access;
  const randomOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("delete non-existent order item", async () => {
    await api.functional.shoppingMall.customer.order_items.erase(
      anotherCustomerConnection,
      {
        orderItemId: randomOrderItemId,
      },
    );
  });
  // 3. Unauthorized deletion attempt by different customer
  // Setup two customers
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_customer_join(
    firstCustomerConnection,
    {},
  );
  firstCustomerConnection.headers ??= {};
  firstCustomerConnection.headers.Authorization = firstAuthorized.token.access;
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_customer_join(
    secondCustomerConnection,
    {},
  );
  secondCustomerConnection.headers ??= {};
  secondCustomerConnection.headers.Authorization =
    secondAuthorized.token.access;
  // First customer creates an order item
  const firstOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      firstCustomerConnection,
      { body: {} },
    );
  typia.assert(firstOrderItem);
  // Second customer attempts to delete the first customer's order item
  await TestValidator.error("unauthorized delete attempt", async () => {
    await api.functional.shoppingMall.customer.order_items.erase(
      secondCustomerConnection,
      {
        orderItemId: firstOrderItem.id,
      },
    );
  });
}
