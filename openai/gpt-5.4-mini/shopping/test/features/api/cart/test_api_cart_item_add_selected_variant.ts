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

export async function test_api_cart_item_add_selected_variant(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test adding a selected product variant to a customer shopping cart.
   *
   * Verifies that an authenticated customer can add a specific purchasable
   * variant to their cart and receive a cart item reflecting the chosen variant
   * and requested quantity.
   *
   * Since the available API surface does not provide a cart retrieval endpoint,
   * the test focuses on the direct cart-item creation response and checks the
   * returned line item data only. This still validates the core business rule
   * that the selected variant is what gets added, not an unrelated product or
   * variant.
   *
   * 1. Create isolated seller and customer connections from the base host.
   * 2. Register and authenticate a seller, then create a product and variant.
   * 3. Register and authenticate a customer, then add the selected variant to a cart.
   * 4. Validate the created cart item matches the selected variant and quantity.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        basePrice: typia.random<number>(),
      },
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
          optionValues: RandomGenerator.name(),
          priceOverride: null,
        } satisfies IMallPlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/products",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 2;
  const cartItem =
    await generate_random_mall_platform_customer_carts_items_create(
      customerConnection,
      {
        params: { cartId },
        body: {
          productVariantId: variant.id,
          quantity,
        } satisfies IMallPlatformCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals(
    "cart item uses selected variant",
    cartItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "cart item quantity matches request",
    cartItem.quantity,
    quantity,
  );
  TestValidator.equals(
    "cart item belongs to requested cart",
    cartItem.shoppingCart.id,
    cartId,
  );
  TestValidator.predicate(
    "cart item is newly created or refreshed",
    cartItem.createdAt <= cartItem.updatedAt,
  );
}
