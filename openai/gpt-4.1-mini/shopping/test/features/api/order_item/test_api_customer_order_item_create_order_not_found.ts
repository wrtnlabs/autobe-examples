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

export async function test_api_customer_order_item_create_order_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test attempt to create a new order item with a non-existent order ID.
  // Authenticate as a customer.
  // Provide a non-existent shoppingMallOrderId with valid product variant ID and quantity.
  // Confirm the API returns an appropriate error indicating that the parent order does not exist or cannot accept items.
  // Verify no order item is created.
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(authorizedCustomer);
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Prepare data to create order item with non-existent order ID
  // Generate an existing order item to get a valid shoppingMallProductVariantId
  const existingOrderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(existingOrderItem);
  // 3. Use fake shoppingMallOrderId that does not exist
  const fakeOrderId = "00000000-0000-0000-0000-000000000000" satisfies string &
    tags.Format<"uuid">;
  const body = {
    shoppingMallOrderId: fakeOrderId,
    shoppingMallProductVariantId:
      existingOrderItem.shoppingMallProductVariantId,
    quantity: 1,
    status: "paid",
  } satisfies IShoppingMallOrderItem.ICreate;
  // 4. Attempt to create order item with non-existent order ID and expect an error
  await TestValidator.error(
    "create order item with non-existent order",
    async () => {
      await api.functional.shoppingMall.customer.order_items.create(
        customerConnection,
        {
          body,
        },
      );
    },
  );
}
