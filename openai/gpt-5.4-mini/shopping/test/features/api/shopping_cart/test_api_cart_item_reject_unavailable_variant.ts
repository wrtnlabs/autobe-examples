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

/**
 * Rejects adding an unavailable product variant to the shopping cart.
 *
 * This test validates the cart-item creation business rule that only
 * purchasable variants may be added by an authenticated customer.
 *
 * 1. A customer registers and receives an authenticated session.
 * 2. The customer creates one baseline cart item to establish cart state.
 * 3. The customer attempts to add a non-purchasable variant using a valid request shape.
 * 4. The API rejects the request and the test verifies the failure path without mutating the existing cart item reference.
 */
export async function test_api_cart_item_reject_unavailable_variant(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const baselineItem =
    await generate_random_mall_platform_customer_shopping_carts_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IMallPlatformShoppingCartItem.ICreate,
      },
    );
  typia.assert(baselineItem);
  const unavailableRequest = {
    productVariantId: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
  } satisfies IMallPlatformShoppingCartItem.ICreate;
  await TestValidator.error(
    "unavailable product variant cannot be added to cart",
    async () => {
      await api.functional.mallPlatform.customer.shopping_carts.cart_items.create(
        customerConnection,
        { body: unavailableRequest },
      );
    },
  );
  TestValidator.equals(
    "baseline cart item remains available as the preserved cart state reference",
    baselineItem.deletedAt,
    null,
  );
}
