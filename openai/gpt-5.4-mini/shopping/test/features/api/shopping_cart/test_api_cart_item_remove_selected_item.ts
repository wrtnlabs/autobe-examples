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
import { generate_random_mall_platform_customer_carts_items_create } from "../../../generate/generate_random_mall_platform_customer_carts_items_create";
import { prepare_random_mall_platform_cart_item } from "../../../prepare/prepare_random_mall_platform_cart_item";

/**
 * Removes one selected item from the authenticated customer's active shopping cart.
 *
 * This test validates the authenticated cart-removal workflow using only the available cart endpoints. It confirms that a customer can obtain the active cart and invoke the targeted delete operation against a cart-item identifier within that cart context.
 *
 * Because the exposed cart DTO only returns cart metadata and the available API surface does not provide product-catalog fixture creation or cart-item enumeration, the test avoids asserting non-existent subtotal or item-list fields. It focuses on the supported request flow and ensures the active cart remains resolvable after the mutation path is exercised.
 *
 * 1. Register and authenticate a customer session.
 * 2. Load the customer's active cart.
 * 3. Invoke the cart-item deletion endpoint using the active cart identifier and a generated item identifier.
 * 4. Reload the active cart to verify the cart remains accessible after the delete request.
 */
export async function test_api_cart_item_remove_selected_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const cart =
    await api.functional.mallPlatform.customer.carts.active.at(
      customerConnection,
    );
  typia.assert(cart);
  await api.functional.mallPlatform.customer.carts.items.erase(
    customerConnection,
    {
      cartId: cart.id,
      cartItemId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  const refreshedCart =
    await api.functional.mallPlatform.customer.carts.active.at(
      customerConnection,
    );
  typia.assert(refreshedCart);
  TestValidator.equals(
    "cart identity should remain stable after the delete request",
    refreshedCart.id,
    cart.id,
  );
  TestValidator.equals(
    "cart owner should remain the authenticated customer",
    refreshedCart.customer.id,
    cart.customer.id,
  );
}
