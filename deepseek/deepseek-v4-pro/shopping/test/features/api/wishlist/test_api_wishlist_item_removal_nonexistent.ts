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
 * Test that deleting a non-existent wishlist item returns 404 Not Found.
 *
 * Validates the API's resource existence checking by attempting to delete a wishlist item with a synthetically generated UUID that does not correspond to any record in the database. This ensures the system properly validates resource existence before attempting deletion and returns the appropriate HTTP error status.
 *
 * 1. Register and authenticate a new customer via the join endpoint.
 * 2. Generate a random UUID v4 that has never been associated with any wishlist item.
 * 3. Attempt to delete the non-existent wishlist item and verify the API responds with 404 Not Found.
 */
export async function test_api_wishlist_item_removal_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Attempt to delete non-existent wishlist item - expect 404
  await TestValidator.httpError(
    "non-existent wishlist item deletion returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.customer.wishlist_items.erase(
        customerConnection,
        {
          wishlistItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
