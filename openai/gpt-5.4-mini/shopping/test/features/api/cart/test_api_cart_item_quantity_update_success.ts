import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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
import { generate_random_mall_platform_customer_carts_items_create } from "../../../generate/generate_random_mall_platform_customer_carts_items_create";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { generate_random_mall_platform_seller_products_variants_create } from "../../../generate/generate_random_mall_platform_seller_products_variants_create";
import { prepare_random_mall_platform_cart_item } from "../../../prepare/prepare_random_mall_platform_cart_item";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";
import { prepare_random_mall_platform_product_variant } from "../../../prepare/prepare_random_mall_platform_product_variant";

export async function test_api_cart_item_quantity_update_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string,
      href: "",
      referrer: "",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      } satisfies DeepPartial<IMallPlatformProduct.ICreate>,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_mall_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          optionValues: "Color: Red / Size: Large",
          priceOverride: null,
        } satisfies DeepPartial<IMallPlatformProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const initialQuantity = 1;
  const cartItem =
    await generate_random_mall_platform_customer_carts_items_create(
      customerConnection,
      {
        params: { cartId },
        body: {
          productVariantId: variant.id,
          quantity: initialQuantity,
        } satisfies DeepPartial<IMallPlatformCartItem.ICreate>,
      },
    );
  typia.assert(cartItem);
  const updatedQuantity = initialQuantity + 2;
  const updated = await api.functional.mallPlatform.customer.carts.items.update(
    customerConnection,
    {
      cartId,
      cartItemId: cartItem.id,
      body: {
        quantity: updatedQuantity,
      } satisfies IMallPlatformCartItem.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "cart item id should remain the same",
    updated.id,
    cartItem.id,
  );
  TestValidator.equals(
    "cart id should remain unchanged",
    updated.shoppingCart.id,
    cartItem.shoppingCart.id,
  );
  TestValidator.equals(
    "variant id should remain unchanged",
    updated.productVariant.id,
    cartItem.productVariant.id,
  );
  TestValidator.equals(
    "quantity should be updated",
    updated.quantity,
    updatedQuantity,
  );
  TestValidator.notEquals(
    "updatedAt should refresh after quantity change",
    updated.updatedAt,
    cartItem.updatedAt,
  );
  TestValidator.equals(
    "cart item should still reference the same variant",
    updated.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "cart item should still belong to the same cart",
    updated.shoppingCart.id,
    cartId,
  );
}
