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

export async function test_api_cart_item_add_variant_to_cart(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost",
      referrer: "http://localhost",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerJoined);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerJoined);
  const cart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(cart);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          optionValues: RandomGenerator.name(),
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const typedVariant = variant as IMallPlatformProductVariant & {
    id: string;
    skuCode: string;
    optionValues: string;
  };
  const quantity = 2;
  const cartItem =
    await generate_random_mall_platform_customer_carts_items_post_by_cartid(
      customerConnection,
      {
        params: { cartId: cart.id },
        body: {
          mall_platform_product_variant_id: typedVariant.id,
          quantity,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals(
    "cart item shopping cart id",
    cartItem.shoppingCart.id,
    cart.id,
  );
  TestValidator.equals(
    "cart item variant id",
    cartItem.productVariant.id,
    typedVariant.id,
  );
  TestValidator.equals("cart item quantity", cartItem.quantity, quantity);
  TestValidator.predicate(
    "cart item availability state exists",
    cartItem.availabilityState.length > 0,
  );
  TestValidator.equals(
    "cart item variant sku code",
    cartItem.productVariant.skuCode,
    typedVariant.skuCode,
  );
  TestValidator.equals(
    "cart item variant option values",
    cartItem.productVariant.optionValues,
    typedVariant.optionValues,
  );
}
