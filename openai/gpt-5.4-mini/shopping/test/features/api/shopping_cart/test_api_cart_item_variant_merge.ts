import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_customer_carts_items_post_by_cartid } from "../../../generate/generate_random_mall_platform_customer_carts_items_post_by_cartid";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_cart_item } from "../../../prepare/prepare_random_mall_platform_cart_item";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_cart_item_variant_merge(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const cart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(cart);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const firstVariant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          skuCode: `sku-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: "red / small",
          priceOverride: 1000,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);
  const secondVariant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          skuCode: `sku-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: "blue / large",
          priceOverride: 1200,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(secondVariant);
  const firstItem =
    await generate_random_mall_platform_customer_carts_items_post_by_cartid(
      customerConnection,
      {
        params: { cartId: cart.id },
        body: {
          mall_platform_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 2,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(firstItem);
  const secondItem =
    await generate_random_mall_platform_customer_carts_items_post_by_cartid(
      customerConnection,
      {
        params: { cartId: cart.id },
        body: {
          mall_platform_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: 3,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(secondItem);
  const updated =
    await api.functional.mallPlatform.customer.carts.items.putByCartidAndCartitemid(
      customerConnection,
      {
        cartId: cart.id,
        cartItemId: secondItem.id,
        body: {
          quantity: 5,
        } satisfies IMallPlatformCartItem.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated cart item should remain in the same cart",
    updated.shoppingCart.id,
    cart.id,
  );
  TestValidator.equals(
    "updated cart item should preserve the requested quantity",
    updated.quantity,
    5,
  );
  TestValidator.equals(
    "updated cart item should remain the same cart item",
    updated.id,
    secondItem.id,
  );
  TestValidator.equals(
    "updated cart item should preserve the selected variant relationship",
    updated.productVariant.product.id,
    productId,
  );
}
