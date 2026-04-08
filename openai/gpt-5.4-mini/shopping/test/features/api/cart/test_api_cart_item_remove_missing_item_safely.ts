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

export async function test_api_cart_item_remove_missing_item_safely(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Safely removes a missing cart item without affecting the customer session.
   *
   * This test validates the cart item deletion contract for an already absent
   * cart item. It ensures the endpoint behaves as a no-op for missing data and
   * does not throw an error when the targeted cart item is not present.
   *
   * 1. Register a customer and create an authenticated customer connection.
   * 2. Call the cart item delete endpoint for a missing cart item identifier.
   */
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: authorized.token.access,
  };
  await api.functional.mallPlatform.customer.shopping_carts.cart_items.erase(
    customerConnection,
    {
      cartItemId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
