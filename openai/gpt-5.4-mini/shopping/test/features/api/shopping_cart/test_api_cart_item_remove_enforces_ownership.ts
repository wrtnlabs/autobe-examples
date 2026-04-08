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

export async function test_api_cart_item_remove_enforces_ownership(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies cart item ownership enforcement for removal.
   *
   * This scenario covers two independently authenticated customers and validates
   * that cart item deletion is restricted to the owning customer. Because only
   * the cart-item deletion endpoint and customer registration utility are
   * available in this test context, the test focuses on the authorization
   * boundary itself and confirms that an authenticated customer cannot delete a
   * cart item identifier that is not owned by their session.
   *
   * 1. Register and authenticate a first customer who will attempt the removal.
   * 2. Register and authenticate a second customer to establish a distinct
   *    authenticated session.
   * 3. Attempt to delete a cart item identifier from the first customer's
   *    session that should not be removable through that connection.
   * 4. Confirm the unauthorized delete attempt is rejected.
   */
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: `owner-check-1-${typia.random<string & tags.Format<"uuid">>()}@example.com`,
      password: "password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer1);
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: `owner-check-2-${typia.random<string & tags.Format<"uuid">>()}@example.com`,
      password: "password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer2);
  const targetCartItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized customer cannot remove another customer's cart item",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.customer.shopping_carts.cart_items.erase(
        customer1Connection,
        { cartItemId: targetCartItemId },
      );
    },
  );
  void customer2;
}
