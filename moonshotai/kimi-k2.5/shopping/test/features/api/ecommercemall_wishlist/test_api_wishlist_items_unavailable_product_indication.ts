import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_customer_wishlist_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

/**
 * Test that wishlist items clearly indicate when products become unavailable.
 *
 * Steps:
 * 1. Seller authenticates and creates a product
 * 2. Customer authenticates and adds product to wishlist
 * 3. Seller soft-deletes the product to make it unavailable
 * 4. Customer retrieves wishlist via PATCH request
 * 5. Verify unavailable product still appears in wishlist
 * 6. Validate availabilityStatus is "unavailable" on the product
 * 7. Verify product details are preserved for reference
 */
export async function test_api_wishlist_items_unavailable_product_indication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - authenticate and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 2. Customer setup - authenticate and add to wishlist
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const wishlistItem =
    await generate_random_ecommerce_mall_customer_wishlist_items_create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        } satisfies IEcommerceMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);
  TestValidator.equals(
    "wishlist item references correct product",
    wishlistItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "initial product availability is available",
    wishlistItem.product.availabilityStatus,
    "available",
  );
  // 3. Seller makes product unavailable (soft-delete)
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 4. Customer retrieves wishlist via PATCH
  const wishlistResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(wishlistResponse);
  // 5. Verify wishlist item still exists for unavailable product
  const retrievedItem = wishlistResponse.data.find(
    (item) => item.product.id === product.id,
  );
  if (!retrievedItem) {
    throw new Error(
      "Wishlist item for unavailable product should still exist but was not found",
    );
  }
  // 6. Validate availability status indicator is "unavailable"
  TestValidator.equals(
    "product availability status indicated as unavailable",
    retrievedItem.product.availabilityStatus,
    "unavailable",
  );
  // 7. Verify product details are preserved for reference
  TestValidator.equals(
    "product name preserved in wishlist",
    retrievedItem.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base price preserved",
    retrievedItem.product.basePrice,
    product.base_price,
  );
  TestValidator.equals(
    "product ID preserved",
    retrievedItem.product.id,
    product.id,
  );
  TestValidator.predicate(
    "product seller information preserved",
    !!retrievedItem.product.seller,
  );
}
