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

export async function test_api_customer_order_item_create_insufficient_stock(
  connection: api.IConnection,
): Promise<void> {
  // Test attempt to create a new order item with insufficient stock in the product variant.
  // Authenticate as a customer.
  // Provide valid order ID and a product variant ID that has stock quantity less than the requested order item quantity.
  // Confirm the API returns an error indicating stock shortage or insufficient stock.
  // Verify no new order item is created.
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Generate one valid order item to get a valid order and variant with stock
  // But we need a variant with insufficient stock, so we attempt to create one
  // We will create a valid order item with some quantity, then try to create another with a quantity greater than stock
  const validOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(validOrderItem);
  // 3. Prepare body with quantity greater than the stock quantity of the variant
  // The stock quantity is available in validOrderItem.productVariant.stockQuantity
  const insufficientQuantity = validOrderItem.productVariant.stockQuantity + 1;
  const body = {
    shoppingMallOrderId: validOrderItem.shoppingMallOrderId,
    shoppingMallProductVariantId: validOrderItem.shoppingMallProductVariantId,
    quantity: insufficientQuantity,
    status: "paid",
  } satisfies IShoppingMallOrderItem.ICreate;
  // 4. Attempt to create order item with insufficient stock quantity
  await TestValidator.error(
    "create order item with quantity exceeding stock should fail",
    async () => {
      await generate_random_shopping_mall_customer_order_items_create(
        customerConnection,
        {
          body,
        },
      );
    },
  );
}
