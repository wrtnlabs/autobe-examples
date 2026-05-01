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

/**
 * Test that deleting a non-existent cart item returns 404 Not Found.
 *
 * Validates the error handling behavior when an authenticated customer attempts
 * to remove a cart item that does not exist in the database. The system must
 * reject the request with a 404 Not Found status, confirming that no cart item
 * with the given identifier exists.
 *
 * 1. Register a new customer account via the join endpoint.
 * 2. Attempt to delete a cart item using a randomly generated UUID that does
 *    not correspond to any existing cart item in the database.
 * 3. Verify the API responds with 404 Not Found.
 */
export async function test_api_cart_item_remove_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Attempt to delete non-existent cart item
  await TestValidator.httpError("non-existent cart item", 404, async () => {
    await api.functional.shoppingMall.customer.cart_items.erase(
      customerConnection,
      {
        cartItemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
