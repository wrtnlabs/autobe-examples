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

export async function test_api_customer_order_item_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test updating an order item with an invalid orderItemId by an authenticated customer.
  // 1. Customer joins the system to obtain authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
    },
  });
  // Update the token header for authenticated calls
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Construct update body with random valid data (optional fields)
  const updateBody: IShoppingMallOrderItem.IUpdate = {
    quantity: typia.random<number & tags.Type<"int32">>(),
    status: "cancelled",
    deletedAt: null,
  };
  // 3. Attempt to update a non-existent order item ID
  const fakeOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // 4. Expect the update operation to throw an HTTP 404 error
  await TestValidator.httpError(
    "not found error on update with invalid orderItemId",
    404,
    async () => {
      await api.functional.shoppingMall.customer.order_items.updateOrderItem(
        customerConnection,
        {
          orderItemId: fakeOrderItemId,
          body: updateBody,
        },
      );
    },
  );
}
