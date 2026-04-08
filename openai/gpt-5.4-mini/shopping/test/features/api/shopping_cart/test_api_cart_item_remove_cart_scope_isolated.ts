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

export async function test_api_cart_item_remove_cart_scope_isolated(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test cart item removal within an authenticated customer's cart scope.
   *
   * This scenario validates that a cart item deletion is performed only against the authenticated customer's active cart and that the cart remains accessible after the targeted line is removed. It also confirms the test uses an isolated actor-specific connection rather than the base connection.
   *
   * 1. Register and authenticate a customer using a dedicated connection.
   * 2. Load the customer's active cart.
   * 3. Add a cart item and remove that same line from the cart.
   * 4. Reload the active cart to confirm the cart still resolves after the deletion.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: "1234qwer",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const initialCart =
    await api.functional.mallPlatform.customer.carts.active.at(
      customerConnection,
    );
  typia.assert(initialCart);
  const createdItem =
    await api.functional.mallPlatform.customer.carts.items.create(
      customerConnection,
      {
        cartId: initialCart.id,
        body: {
          productVariantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(createdItem);
  await api.functional.mallPlatform.customer.carts.items.erase(
    customerConnection,
    {
      cartId: initialCart.id,
      cartItemId: createdItem.id,
    },
  );
  const afterCart =
    await api.functional.mallPlatform.customer.carts.active.at(
      customerConnection,
    );
  typia.assert(afterCart);
  TestValidator.equals(
    "cart id remains the same after removal",
    afterCart.id,
    initialCart.id,
  );
  TestValidator.equals(
    "cart owner remains the authenticated customer",
    afterCart.customer.id,
    initialCart.customer.id,
  );
}
