import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_item_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account to have cart items
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: email satisfies string as string,
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Create a new connection for the unauthorized deletion attempt
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Use a valid UUID for the cart item ID
  const cartItemId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete cart item without authentication
  // This should fail because the connection is unauthenticated
  await TestValidator.error(
    "unauthorized cart item deletion should be rejected",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.erase(
        unauthorizedConnection,
        {
          cartItemId: cartItemId,
        },
      );
    },
  );
}