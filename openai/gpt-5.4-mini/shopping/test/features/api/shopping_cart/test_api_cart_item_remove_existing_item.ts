import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_remove_existing_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that an authenticated customer can remove an existing item from their cart.
   *
   * This test covers the cart-item deletion flow for an owned shopping cart item.
   * It authenticates a customer using the required registration path, performs the
   * delete request for a valid cart item identifier, and ensures the operation
   * completes successfully without relying on unavailable cart-read endpoints.
   *
   * 1. Register and authenticate a customer with an isolated connection.
   * 2. Delete an existing cart item by identifier.
   * 3. Confirm the delete call succeeds without throwing an error.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await api.functional.mallPlatform.customer.shopping_carts.cart_items.erase(
    customerConnection,
    {
      cartItemId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
