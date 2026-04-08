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

export async function test_api_cart_item_merge_duplicate_variant_quantity(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const firstQuantity = 1;
  const secondQuantity = 2;
  const firstItem =
    await api.functional.mallPlatform.customer.shopping_carts.cart_items.create(
      customerConnection,
      {
        body: {
          productVariantId: variantId,
          quantity: firstQuantity,
        } satisfies IMallPlatformShoppingCartItem.ICreate,
      },
    );
  typia.assert(firstItem);
  const secondItem =
    await api.functional.mallPlatform.customer.shopping_carts.cart_items.create(
      customerConnection,
      {
        body: {
          productVariantId: variantId,
          quantity: secondQuantity,
        } satisfies IMallPlatformShoppingCartItem.ICreate,
      },
    );
  typia.assert(secondItem);
  TestValidator.equals(
    "merged cart item keeps the same variant identity",
    secondItem.productVariant.id,
    firstItem.productVariant.id,
  );
  TestValidator.equals(
    "merged cart item quantity equals the sum of both additions",
    secondItem.quantity,
    firstQuantity + secondQuantity,
  );
  TestValidator.equals(
    "cart item remains attached to the same cart",
    secondItem.shoppingCart.id,
    firstItem.shoppingCart.id,
  );
  TestValidator.equals(
    "cart item variant SKU stays the same after merge",
    secondItem.productVariant.skuCode,
    firstItem.productVariant.skuCode,
  );
}
