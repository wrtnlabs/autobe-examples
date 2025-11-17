import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_order_item_deletion_without_authentication(
  connection: api.IConnection,
) {
  // 1. Perform customer join to ensure prerequisite user exists
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: `http://localhost/${RandomGenerator.alphabets(8)}`,
    referrer: `http://referrer.com/${RandomGenerator.alphabets(8)}`,
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: customerCreateBody,
    },
  );
  typia.assert(authorizedCustomer);

  // 2. Attempt to delete order item using unauthenticated connection
  // Create unauthenticated connection by cloning but removing Authorization header
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Use random UUIDs for orderId and orderItemId since we don't have actual ones
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt the erase call with unauthenticated connection and expect error
  await TestValidator.error(
    "deleting order item without authentication should fail",
    async () => {
      await api.functional.shoppingMall.customer.orders.orderItems.erase(
        unauthenticatedConnection,
        {
          orderId,
          orderItemId,
        },
      );
    },
  );
}
