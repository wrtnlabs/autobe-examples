import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_wishlist_add_product_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a category for the product (need UUID for product creation)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Seller creates a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 5. Add product to customer's wishlist
  const wishlistItem =
    await api.functional.ecommerceMall.customer.wishlist_items.create(
      customerConnection,
      {
        body: {
          product_id: product.id,
        } satisfies IEcommerceMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);
  // 6. Validate wishlist item response
  TestValidator.equals(
    "customer_id matches registered customer",
    wishlistItem.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "product_id matches created product",
    wishlistItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    wishlistItem.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base_price matches",
    wishlistItem.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "product slug matches",
    wishlistItem.product.slug,
    product.slug,
  );
  TestValidator.equals(
    "product status matches",
    wishlistItem.product.status,
    product.status,
  );
  TestValidator.equals(
    "product category matches",
    wishlistItem.product.category,
    product.category,
  );
  TestValidator.notEquals(
    "created_at is not null",
    wishlistItem.created_at,
    null,
  );
  TestValidator.equals("deleted_at is null", wishlistItem.deleted_at, null);
  // 7. Verify product level (not variant level)
  // The wishlist item's product should contain product-level information
  TestValidator.notEquals(
    "product has summary data",
    wishlistItem.product.id,
    undefined,
  );
  TestValidator.notEquals(
    "product has name",
    wishlistItem.product.name,
    undefined,
  );
  TestValidator.notEquals(
    "product has base_price",
    wishlistItem.product.base_price,
    undefined,
  );
  TestValidator.notEquals(
    "product has slug",
    wishlistItem.product.slug,
    undefined,
  );
  TestValidator.notEquals(
    "product has status",
    wishlistItem.product.status,
    undefined,
  );
  TestValidator.notEquals(
    "product has category",
    wishlistItem.product.category,
    undefined,
  );
  TestValidator.notEquals(
    "product has deleted_at",
    wishlistItem.product.deleted_at,
    undefined,
  );
}