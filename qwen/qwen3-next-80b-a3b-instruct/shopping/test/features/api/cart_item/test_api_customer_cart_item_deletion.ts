import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_item_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate customer using utility function
  const authResponse = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authResponse);
  // Use the authenticated connection for cart operations
  // Generate a random UUID for a cart item ID to delete
  // This assumes there exists a cart item for this customer in the test environment
  const cartItemId = typia.random<string & tags.Format<"uuid">>();
  // Call the delete endpoint for the cart item
  await api.functional.shoppingMall.customer.carts.erase(customerConnection, {
    cartItemId,
  });
  // No response body expected, so no typia.assert needed
  // This is a 204 No Content response
}
