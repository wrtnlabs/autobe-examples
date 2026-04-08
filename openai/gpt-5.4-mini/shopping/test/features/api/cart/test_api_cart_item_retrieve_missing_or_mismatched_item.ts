import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify cart-item retrieval fails for missing or unresolved cart identifiers.
 *
 * This test validates cart ownership enforcement on the cart-item detail endpoint.
 * It confirms that a customer-authenticated request cannot retrieve a cart item when the cart
 * identifier and cart-item identifier do not resolve to an existing owned resource pair.
 *
 * 1. Register a customer account and obtain an authenticated customer connection.
 * 2. Call the cart-item retrieval endpoint using unresolved UUID identifiers.
 * 3. Confirm the service rejects the lookup with a not-found style error and does not require
 *    any cart mutation setup.
 */
export async function test_api_cart_item_retrieve_missing_or_mismatched_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const cartItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing cart item lookup should be rejected",
    [400, 404],
    async () => {
      await api.functional.mallPlatform.customer.carts.items.at(
        customerConnection,
        {
          cartId,
          cartItemId,
        },
      );
    },
  );
}
