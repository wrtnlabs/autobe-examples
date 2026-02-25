import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
import { generate_random_shopping_mall_customer_wishlist_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_customer_wishlist } from "../../../prepare/prepare_random_shopping_mall_customer_wishlist";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_customer_wishlist_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    password: "12345678",
    display_name: RandomGenerator.name(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  // 2. Seller creates a product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    password: "12345678",
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<number & tags.MultipleOf<0.01>>(),
        shopping_mall_category_id: "00000000-0000-0000-0000-000000000000",
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "color",
                option_value: RandomGenerator.pick(["red", "blue", "green"]),
              },
            ],
            stock_quantity: 10,
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const productId = product.id;
  // 3. Customer adds product to wishlist (first time)
  const wishlistItem1 =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: productId,
        } satisfies IShoppingMallCustomerWishlist.ICreate,
      },
    );
  typia.assert(wishlistItem1);
  TestValidator.equals(
    "product ID matches",
    wishlistItem1.product.id,
    productId,
  );
  // 4. Customer attempts to add the same product again (should fail with 409 Conflict)
  await TestValidator.error("duplicate wishlist entry", async () => {
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: productId,
        } satisfies IShoppingMallCustomerWishlist.ICreate,
      },
    );
  });
}
