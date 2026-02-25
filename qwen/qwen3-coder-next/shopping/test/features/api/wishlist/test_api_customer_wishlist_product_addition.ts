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

export async function test_api_customer_wishlist_product_addition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinResponse =
    await api.functional.shoppingMall.auth.customer.join(customerConnection, {
      body: {
        email: customerEmail satisfies string as string,
        password: customerPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerJoinResponse);
  // 2. Login as the customer
  const customerLoginResponse =
    await api.functional.shoppingMall.auth.customer.login(customerConnection, {
      body: {
        email: customerEmail satisfies string as string,
        password: customerPassword,
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLoginResponse);
  // 3. Register a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const shopName = RandomGenerator.name();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: sellerEmail satisfies string as string,
        password: sellerPassword,
        shop_name: shopName,
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResponse);
  // 4. Login as the seller
  const sellerLoginResponse =
    await api.functional.shoppingMall.auth.seller.login(sellerConnection, {
      body: {
        email: sellerEmail satisfies string as string,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLoginResponse);
  // 5. Create a product
  const productResponse =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          } satisfies IShoppingMallProductImage.ICreate,
        ],
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            option_values: [
              {
                option_name: "color",
                option_value: "red",
              } satisfies IShoppingMallProductVariantOptionValue.ICreate,
            ],
            stock_quantity: 100,
          } satisfies IShoppingMallProductVariant.ICreate,
        ],
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(productResponse);
  // 6. Login again as the customer to refresh authentication
  const customerLoginResponse2 =
    await api.functional.shoppingMall.auth.customer.login(customerConnection, {
      body: {
        email: customerEmail satisfies string as string,
        password: customerPassword,
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLoginResponse2);
  // 7. Add the product to the customer's wishlist
  const wishlistResponse =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: productResponse.id,
        } satisfies IShoppingMallCustomerWishlist.ICreate,
      },
    );
  typia.assert(wishlistResponse);
  // 8. Verify the product appears in the customer's wishlist
  TestValidator.equals(
    "wishlist product ID",
    wishlistResponse.product.id,
    productResponse.id,
  );
  TestValidator.equals(
    "wishlist customer ID",
    wishlistResponse.customer.id,
    customerLoginResponse2.id,
  );
}
