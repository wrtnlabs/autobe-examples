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
 * Test cart item deletion when cart item doesn't exist (soft-deleted or never existed).
 * This scenario validates proper error handling when attempting to delete a non-existent cart item.
 */
export async function test_api_customer_cart_item_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for testing
  const customerConnection: api.IConnection = { host: connection.host };
  // Register and login as customer using utility function
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create new connection with authentication token (utility function updates headers)
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    authorization: `Bearer ${customerAuth.token.access}`,
  };
  // Test 1: Attempt to delete a non-existent cart item (should fail with CartNotFound)
  const nonExistentCartId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw CartNotFound error for non-existent cart",
    async () => {
      await api.functional.shoppingMall.customer.carts.erase(
        authenticatedConnection,
        {
          cartId: nonExistentCartId,
        },
      );
    },
  );
}
