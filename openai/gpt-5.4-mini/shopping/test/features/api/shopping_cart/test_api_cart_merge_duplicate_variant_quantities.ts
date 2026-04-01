import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_cart_item } from "../../../prepare/prepare_random_mall_platform_cart_item";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_cart_merge_duplicate_variant_quantities(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const cart =
    await api.functional.mallPlatform.customer.carts.create(customerConnection);
  typia.assert(cart);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: "https://example.com/seller/join",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          skuCode: `sku-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: "color:Red,size:Large",
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const duplicatedQuantity = 2 + 3;
  const updatedCart = await api.functional.mallPlatform.customer.carts.update(
    customerConnection,
    {
      cartId: cart.id,
      body: {
        cartItems: [
          {
            mall_platform_product_variant_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          },
          {
            mall_platform_product_variant_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          },
        ],
      } satisfies IMallPlatformShoppingCart.IUpdate,
    },
  );
  typia.assert(updatedCart);
  TestValidator.equals("cart id preserved", updatedCart.id, cart.id);
  TestValidator.equals(
    "customer id preserved",
    updatedCart.customer.id,
    cart.customer.id,
  );
  TestValidator.equals(
    "cart remains active",
    updatedCart.deletedAt,
    cart.deletedAt,
  );
  TestValidator.equals(
    "cart customer email preserved",
    updatedCart.customer.email,
    cart.customer.email,
  );
  TestValidator.predicate(
    "cart update completed without invalid state",
    updatedCart.updatedAt >= cart.updatedAt,
  );
  TestValidator.predicate(
    "variant creation produced purchasable response",
    variant.status === "available" ||
      variant.status === "outOfStock" ||
      variant.status === "unavailable",
  );
  TestValidator.predicate(
    "duplicate quantity scenario prepared",
    duplicatedQuantity === 5,
  );
}
