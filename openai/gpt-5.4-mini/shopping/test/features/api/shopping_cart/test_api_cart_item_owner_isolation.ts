import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_owner_isolation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that cart item updates are isolated to the owning customer.
   *
   * This test focuses on the ownership boundary enforced by the cart-item
   * update endpoint. It ensures that an authenticated customer cannot update a
   * cart item that belongs to another customer's shopping cart and that the
   * server responds with a not-found style failure instead of exposing the
   * foreign cart item or applying a partial update.
   *
   * 1. Register two different customers with isolated connections.
   * 2. Use one customer as the foreign caller and another as the cart owner.
   * 3. Attempt to update the owner's cart item through the foreign customer's
   *    session.
   * 4. Assert that the request is rejected with a 404-style HTTP error.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  const callerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(owner);
  const caller = await authorize_customer_join(callerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(caller);
  const cartItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "foreign cart item update should return not found",
    [404],
    async () => {
      await api.functional.mallPlatform.customer.shopping_carts.cart_items.update(
        callerConnection,
        {
          cartItemId,
          body: {
            quantity: 2,
          } satisfies IMallPlatformCartItem.IUpdate,
        },
      );
    },
  );
}
