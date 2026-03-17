import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_nonexistent_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create a new customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Register a new customer for authentication
  await authorize_customer_join(customerConnection, {});
  // Generate a random UUID that does not exist in the cart
  const nonExistentCartItemId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete a non-existent cart item and expect 404 error
  await TestValidator.httpError(
    "should return 404 when deleting non-existent cart item",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.cart.erase(
        customerConnection,
        {
          cartItemId: nonExistentCartItemId,
        },
      );
    },
  );
}
