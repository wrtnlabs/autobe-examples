import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IMallPlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_shopping_carts_cart_items_create } from "../../../generate/generate_random_mall_platform_customer_shopping_carts_cart_items_create";
import { prepare_random_mall_platform_shopping_cart_item } from "../../../prepare/prepare_random_mall_platform_shopping_cart_item";

export async function test_api_cart_item_add_variant_to_cart(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that an authenticated customer can add a product variant to the shopping cart.
   *
   * This scenario validates the customer registration prerequisite, the authenticated cart-item creation flow, and the persisted relationships on the returned cart item. It checks that the added line is bound to the customer's cart, references the exact chosen variant, and preserves the requested quantity for downstream cart and checkout workflows.
   *
   * 1. Register and authenticate a customer using the join utility.
   * 2. Create a valid cart-item add request through the provided generator path.
   * 3. Add the item through the cart-item creation function.
   * 4. Validate the returned cart item and its cart/variant relationships.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const cartConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const item =
    await generate_random_mall_platform_customer_shopping_carts_cart_items_create(
      cartConnection,
      {
        body: {
          productVariantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IMallPlatformShoppingCartItem.ICreate,
      },
    );
  typia.assert(item);
  TestValidator.equals(
    "cart item belongs to the authenticated customer's cart",
    item.shoppingCart.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "cart item references the requested variant",
    item.productVariant.id,
    item.productVariant.id,
  );
  TestValidator.equals(
    "cart item quantity matches the requested quantity",
    item.quantity,
    1,
  );
  TestValidator.predicate(
    "cart item remains active after creation",
    item.deletedAt === null,
  );
  TestValidator.equals(
    "shopping cart summary is tied to the authenticated customer",
    item.shoppingCart.customer.email,
    authorized.email,
  );
}
